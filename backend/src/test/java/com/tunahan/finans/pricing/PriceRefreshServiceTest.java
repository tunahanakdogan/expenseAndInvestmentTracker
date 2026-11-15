package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.pricing.PriceRefreshService.RefreshResult;
import com.tunahan.finans.pricing.TrackedAssetSource.TrackedAsset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class PriceRefreshServiceTest {

    private PriceWriter writer;
    private ExchangeRateProvider rateProvider;
    private PriceProvider yahoo;
    private PriceProvider finnhub;
    private PriceProvider gold;
    private PriceProvider tefas;
    private ObjectProvider<TrackedAssetSource> sources;
    private TrackedAssetSource source;
    private PriceRefreshService service;

    @BeforeEach
    void setUp() {
        writer = mock(PriceWriter.class);
        rateProvider = mock(ExchangeRateProvider.class);
        when(rateProvider.source()).thenReturn("TCMB");
        yahoo = provider(AssetType.BIST_STOCK, "YAHOO");
        finnhub = provider(AssetType.US_STOCK, "FINNHUB");
        gold = provider(AssetType.GOLD, "GOLD");
        tefas = provider(AssetType.FUND, "TEFAS");
        source = mock(TrackedAssetSource.class);
        sources = mock(ObjectProvider.class);
        when(sources.stream()).thenAnswer(i -> Stream.of(source));
        service = new PriceRefreshService(List.of(yahoo, finnhub, gold, tefas), rateProvider, writer, sources);
    }

    private static PriceProvider provider(AssetType type, String name) {
        PriceProvider p = mock(PriceProvider.class);
        when(p.supports(any())).thenAnswer(i -> i.getArgument(0) == type);
        when(p.source()).thenReturn(name);
        return p;
    }

    private void tracked(TrackedAsset... assets) {
        when(source.trackedAssets()).thenReturn(List.of(assets));
    }

    @Test
    void refreshRatesWritesEveryRateAndCounts() {
        when(rateProvider.fetchRates()).thenReturn(Map.of("USD", new BigDecimal("34.1234"), "EUR", new BigDecimal("36.5678")));

        RefreshResult result = service.refreshRates();

        verify(writer).saveRate("USD", new BigDecimal("34.1234"), "TCMB");
        verify(writer).saveRate("EUR", new BigDecimal("36.5678"), "TCMB");
        assertThat(result.updatedRates()).isEqualTo(2);
        assertThat(result.failed()).isEmpty();
    }

    @Test
    void emptyRateMapReportsRatesFailed() {
        when(rateProvider.fetchRates()).thenReturn(Map.of());

        RefreshResult result = service.refreshRates();

        assertThat(result.failed()).containsExactly("RATES");
        verify(writer, never()).saveRate(anyString(), any(), anyString());
    }

    @Test
    void rateProviderThrowingIsCaughtAndReported() {
        when(rateProvider.fetchRates()).thenThrow(new RuntimeException("boom"));

        RefreshResult result = service.refreshRates();

        assertThat(result.failed()).containsExactly("RATES");
    }

    @Test
    void oneProviderThrowingDoesNotStopOthers() {
        tracked(new TrackedAsset(AssetType.BIST_STOCK, "THYAO"), new TrackedAsset(AssetType.US_STOCK, "AAPL"));
        when(yahoo.fetchPrices(any())).thenThrow(new RuntimeException("boom"));
        when(finnhub.fetchPrices(any())).thenReturn(Map.of("AAPL", new BigDecimal("189.84")));

        RefreshResult result = service.refreshPrices(Set.of(AssetType.BIST_STOCK, AssetType.US_STOCK));

        verify(writer).savePrice(AssetType.US_STOCK, "AAPL", new BigDecimal("189.84"), "USD", "FINNHUB");
        assertThat(result.failed()).containsExactly("BIST_STOCK:THYAO");
        assertThat(result.updatedPrices()).isEqualTo(1);
    }

    @Test
    void missingSymbolIsReportedInFailed() {
        tracked(new TrackedAsset(AssetType.BIST_STOCK, "THYAO"), new TrackedAsset(AssetType.BIST_STOCK, "ASELS"));
        when(yahoo.fetchPrices(any())).thenReturn(Map.of("THYAO", new BigDecimal("312.5")));

        RefreshResult result = service.refreshPrices(Set.of(AssetType.BIST_STOCK));

        verify(writer).savePrice(AssetType.BIST_STOCK, "THYAO", new BigDecimal("312.5"), "TRY", "YAHOO");
        assertThat(result.failed()).containsExactly("BIST_STOCK:ASELS");
        assertThat(result.updatedPrices()).isEqualTo(1);
    }

    @Test
    void writerFailureIsReportedAndContinues() {
        tracked(new TrackedAsset(AssetType.BIST_STOCK, "THYAO"), new TrackedAsset(AssetType.BIST_STOCK, "ASELS"));
        when(yahoo.fetchPrices(any())).thenReturn(Map.of("THYAO", BigDecimal.ONE, "ASELS", BigDecimal.TEN));
        doThrow(new RuntimeException("db")).when(writer).savePrice(eq(AssetType.BIST_STOCK), eq("THYAO"), any(), anyString(), anyString());

        RefreshResult result = service.refreshPrices(Set.of(AssetType.BIST_STOCK));

        verify(writer).savePrice(AssetType.BIST_STOCK, "ASELS", BigDecimal.TEN, "TRY", "YAHOO");
        assertThat(result.failed()).containsExactly("BIST_STOCK:THYAO");
        assertThat(result.updatedPrices()).isEqualTo(1);
    }

    @Test
    void noTrackedAssetSourceBeanOnlyRefreshesRates() {
        when(sources.stream()).thenAnswer(i -> Stream.empty());
        when(rateProvider.fetchRates()).thenReturn(Map.of("USD", BigDecimal.ONE));

        RefreshResult result = service.refreshAll();

        assertThat(result.updatedRates()).isEqualTo(1);
        assertThat(result.updatedPrices()).isZero();
        verify(yahoo, never()).fetchPrices(any());
        verify(finnhub, never()).fetchPrices(any());
        verify(gold, never()).fetchPrices(any());
        verify(tefas, never()).fetchPrices(any());
        verify(source, never()).trackedAssets();
    }

    @Test
    void duplicateTrackedAssetsAreFetchedOnce() {
        tracked(new TrackedAsset(AssetType.BIST_STOCK, "THYAO"), new TrackedAsset(AssetType.BIST_STOCK, "THYAO"));
        when(yahoo.fetchPrices(any())).thenReturn(Map.of("THYAO", BigDecimal.ONE));

        service.refreshPrices(Set.of(AssetType.BIST_STOCK));

        verify(yahoo).fetchPrices(Set.of("THYAO"));
    }

    @Test
    void currencyTypeIsSkippedSilently() {
        tracked(new TrackedAsset(AssetType.CURRENCY, "USD"));

        RefreshResult result = service.refreshPrices(Set.of(AssetType.CURRENCY, AssetType.BIST_STOCK));

        assertThat(result.failed()).isEmpty();
        verify(yahoo, never()).fetchPrices(any());
    }

    @Test
    void goldUsesTryCurrencyAndGoldSource() {
        tracked(new TrackedAsset(AssetType.GOLD, "GRAM"));
        when(gold.fetchPrices(any())).thenReturn(Map.of("GRAM", new BigDecimal("2907.84225891")));

        service.refreshPrices(Set.of(AssetType.GOLD));

        verify(writer).savePrice(AssetType.GOLD, "GRAM", new BigDecimal("2907.84225891"), "TRY", "GOLD");
    }
}
