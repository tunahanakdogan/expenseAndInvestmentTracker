package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class YahooPriceProviderTest {

    private static final String BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

    private MockRestServiceServer server;
    private YahooPriceProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new YahooPriceProvider(new YahooChartClient(builder.build()));
    }

    private void respond(String symbol, String body) {
        server.expect(requestTo(BASE + symbol)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void supportsOnlyBistStock() {
        assertThat(provider.supports(AssetType.BIST_STOCK)).isTrue();
        assertThat(provider.supports(AssetType.US_STOCK)).isFalse();
        assertThat(provider.supports(AssetType.FUND)).isFalse();
        assertThat(provider.supports(AssetType.CURRENCY)).isFalse();
        assertThat(provider.supports(AssetType.GOLD)).isFalse();
        assertThat(provider.source()).isEqualTo("YAHOO");
    }

    @Test
    void parsesRegularMarketPriceAndStripsSuffix() {
        respond("THYAO.IS", PricingFixtures.read("yahoo-thyao.json"));

        var prices = provider.fetchPrices(Set.of("THYAO"));

        assertThat(prices).containsOnlyKeys("THYAO");
        assertThat(prices.get("THYAO")).isEqualByComparingTo("312.5");
    }

    @Test
    void missingResultIsOmitted() {
        respond("THYAO.IS", PricingFixtures.read("yahoo-no-result.json"));

        assertThat(provider.fetchPrices(Set.of("THYAO"))).isEmpty();
    }

    @Test
    void zeroPriceIsIgnored() {
        respond("THYAO.IS", "{\"chart\":{\"result\":[{\"meta\":{\"regularMarketPrice\":0}}]}}");

        assertThat(provider.fetchPrices(Set.of("THYAO"))).isEmpty();
    }

    @Test
    void negativePriceIsIgnored() {
        respond("THYAO.IS", "{\"chart\":{\"result\":[{\"meta\":{\"regularMarketPrice\":-1}}]}}");

        assertThat(provider.fetchPrices(Set.of("THYAO"))).isEmpty();
    }

    @Test
    void metaMissingIsOmitted() {
        respond("THYAO.IS", "{\"chart\":{\"result\":[{}]}}");

        assertThat(provider.fetchPrices(Set.of("THYAO"))).isEmpty();
    }

    @Test
    void htmlBodyIsOmitted() {
        respond("THYAO.IS", "<html>bakimda</html>");

        assertThat(provider.fetchPrices(Set.of("THYAO"))).isEmpty();
    }

    @Test
    void oneSymbolFailingDoesNotBlockOthers() {
        server.expect(requestTo(BASE + "THYAO.IS")).andRespond(withStatus(HttpStatus.NOT_FOUND));
        respond("ASELS.IS", PricingFixtures.read("yahoo-thyao.json"));

        var prices = provider.fetchPrices(new LinkedHashSet<>(List.of("THYAO", "ASELS")));

        assertThat(prices).containsOnlyKeys("ASELS");
    }

    @Test
    void networkErrorStopsRemainingSymbols() {
        server.expect(ExpectedCount.once(), requestTo(startsWith(BASE)))
                .andRespond(withException(new SocketTimeoutException()));

        assertThat(provider.fetchPrices(Set.of("A", "B", "C"))).isEmpty();
        server.verify();
    }

    @Test
    void specialCharactersInSymbolAreEncoded() {
        respond("A%2FB.IS", PricingFixtures.read("yahoo-thyao.json"));

        assertThat(provider.fetchPrices(Set.of("A/B"))).containsOnlyKeys("A/B");
        server.verify();
    }
}
