package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoldPriceProviderTest {

    private static final String URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F";
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 16);

    private MockRestServiceServer server;
    private PriceQueryService prices;
    private GoldPriceProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        prices = mock(PriceQueryService.class);
        PricingClock clock = new PricingClock(Clock.fixed(Instant.parse("2026-11-16T09:00:00Z"), ZoneOffset.UTC));
        provider = new GoldPriceProvider(new YahooChartClient(builder.build()), prices, clock);
    }

    @Test
    void gramTryMatchesFormula() {
        assertThat(GoldPriceProvider.gramTry(new BigDecimal("2000"), new BigDecimal("34")))
                .isEqualTo(new BigDecimal("2186.24913595"));
    }

    @Test
    void supportsOnlyGold() {
        assertThat(provider.supports(AssetType.GOLD)).isTrue();
        assertThat(provider.supports(AssetType.FUND)).isFalse();
        assertThat(provider.source()).isEqualTo("GOLD");
    }

    @Test
    void fetchPricesCombinesOunceAndRate() {
        when(prices.rateToTry("USD", TODAY)).thenReturn(Optional.of(new BigDecimal("34.1234")));
        server.expect(requestTo(URL))
                .andRespond(withSuccess(PricingFixtures.read("yahoo-gold.json"), MediaType.APPLICATION_JSON));

        var result = provider.fetchPrices(Set.of("GRAM"));

        assertThat(result).containsOnlyKeys("GRAM");
        assertThat(result.get("GRAM")).isEqualTo(GoldPriceProvider.gramTry(new BigDecimal("2650.5"), new BigDecimal("34.1234")));
        assertThat(result.get("GRAM")).isEqualTo(new BigDecimal("2907.84225891"));
    }

    @Test
    void unknownSymbolsAreOmitted() {
        when(prices.rateToTry("USD", TODAY)).thenReturn(Optional.of(new BigDecimal("34.1234")));
        server.expect(requestTo(URL))
                .andRespond(withSuccess(PricingFixtures.read("yahoo-gold.json"), MediaType.APPLICATION_JSON));

        assertThat(provider.fetchPrices(Set.of("GRAM", "XAU"))).containsOnlyKeys("GRAM");

        assertThat(provider.fetchPrices(Set.of("XAU"))).isEmpty();
        server.verify();
    }

    @Test
    void missingUsdRateReturnsEmpty() {
        when(prices.rateToTry("USD", TODAY)).thenReturn(Optional.empty());

        assertThat(provider.fetchPrices(Set.of("GRAM"))).isEmpty();
        server.verify();
    }

    @Test
    void yahooFailureReturnsEmpty() {
        when(prices.rateToTry("USD", TODAY)).thenReturn(Optional.of(new BigDecimal("34")));
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThat(provider.fetchPrices(Set.of("GRAM"))).isEmpty();
    }

    @Test
    void networkErrorReturnsEmpty() {
        when(prices.rateToTry("USD", TODAY)).thenReturn(Optional.of(new BigDecimal("34")));
        server.expect(requestTo(URL)).andRespond(withException(new SocketTimeoutException()));

        assertThat(provider.fetchPrices(Set.of("GRAM"))).isEmpty();
    }
}
