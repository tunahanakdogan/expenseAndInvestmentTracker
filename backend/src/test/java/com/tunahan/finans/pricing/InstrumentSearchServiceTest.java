package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InstrumentSearchServiceTest {

    private final YahooSymbolSearch yahoo = mock(YahooSymbolSearch.class);
    private final TefasFundCatalog funds = mock(TefasFundCatalog.class);
    private final ExchangeRateRepository rates = mock(ExchangeRateRepository.class);
    private InstrumentSearchService service;

    @BeforeEach
    void setUp() {
        when(yahoo.search(anyString())).thenReturn(List.of());
        when(funds.search(anyString())).thenReturn(List.of());
        when(rates.findDistinctCurrencies()).thenReturn(List.of("USD", "EUR", "GBP"));
        service = new InstrumentSearchService(yahoo, funds, rates);
    }

    @Test
    void shortQueryReturnsNothingWithoutCallingSources() {
        assertThat(service.search(" a ")).isEmpty();
        verify(yahoo, never()).search(anyString());
        verify(funds, never()).search(anyString());
    }

    @Test
    void combinesSourcesInOrderWithExactCodeFirst() {
        when(yahoo.search("usd")).thenReturn(List.of(new Instrument(AssetType.US_STOCK, "USDX", "Usd Index Fund", "NYSEArca")));
        when(funds.search("usd")).thenReturn(List.of(new Instrument(AssetType.FUND, "USD", "USD Fonu", "TEFAS")));

        assertThat(service.search("usd")).containsExactly(
                new Instrument(AssetType.FUND, "USD", "USD Fonu", "TEFAS"),
                new Instrument(AssetType.CURRENCY, "USD", "ABD Doları", "TCMB"),
                new Instrument(AssetType.US_STOCK, "USDX", "Usd Index Fund", "NYSEArca"));
    }

    @Test
    void currenciesMatchByTurkishNameIgnoringCharacters() {
        assertThat(service.search("dolar")).containsExactly(
                new Instrument(AssetType.CURRENCY, "USD", "ABD Doları", "TCMB"));
        assertThat(service.search("ingiliz")).extracting(Instrument::symbol).containsExactly("GBP");
    }

    @Test
    void goldMatchesItsKeywords() {
        Instrument gram = new Instrument(AssetType.GOLD, "GRAM", "Gram altın", "");
        assertThat(service.search("altin")).containsExactly(gram);
        assertThat(service.search("gram")).containsExactly(gram);
        assertThat(service.search("gold")).containsExactly(gram);
    }

    @Test
    void returnsAtMostTwentyResults() {
        when(yahoo.search("hisse")).thenReturn(IntStream.range(0, 30)
                .mapToObj(i -> new Instrument(AssetType.BIST_STOCK, "S" + i, "Hisse " + i, "IST")).toList());

        assertThat(service.search("hisse")).hasSize(20);
    }
}
