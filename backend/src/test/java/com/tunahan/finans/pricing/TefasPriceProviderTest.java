package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TefasPriceProviderTest {

    private static final String URL = "https://www.tefas.gov.tr/api/DB/BindHistoryInfo";

    private MockRestServiceServer server;
    private TefasPriceProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        PricingClock clock = new PricingClock(Clock.fixed(Instant.parse("2026-11-16T09:00:00Z"), ZoneOffset.UTC));
        provider = new TefasPriceProvider(builder.build(), clock);
    }

    private void respond(String body) {
        server.expect(requestTo(URL)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void picksPriceOfLatestDate() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formDataContains(Map.of(
                        "fontip", "YAT", "fonkod", "AFT", "bastarih", "09.11.2026", "bittarih", "16.11.2026")))
                .andRespond(withSuccess(PricingFixtures.read("tefas-aft.json"), MediaType.APPLICATION_JSON));

        var prices = provider.fetchPrices(Set.of("AFT"));

        assertThat(prices).containsOnlyKeys("AFT");
        assertThat(prices.get("AFT")).isEqualByComparingTo("0.523456");
        assertThat(provider.supports(AssetType.FUND)).isTrue();
        assertThat(provider.supports(AssetType.GOLD)).isFalse();
        assertThat(provider.source()).isEqualTo("TEFAS");
    }

    @Test
    void emptyDataIsOmitted() {
        respond(PricingFixtures.read("tefas-empty.json"));

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void nonJsonBodyIsOmitted() {
        respond("<html>bakimda</html>");

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void zeroPriceIsIgnored() {
        respond("{\"data\":[{\"TARIH\":\"1731715200000\",\"FONKODU\":\"AFT\",\"FIYAT\":0}]}");

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void httpErrorIsOmittedAndOthersContinue() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        respond(PricingFixtures.read("tefas-aft.json"));

        assertThat(provider.fetchPrices(new LinkedHashSet<>(List.of("AAA", "AFT")))).hasSize(1);
    }

    @Test
    void networkErrorStopsRemainingSymbols() {
        server.expect(ExpectedCount.once(), requestTo(URL)).andRespond(withException(new SocketTimeoutException()));

        assertThat(provider.fetchPrices(Set.of("A", "B", "C"))).isEmpty();
        server.verify();
    }

    @Test
    void fonkodWithSpecialCharsIsFormEncoded() {
        server.expect(requestTo(URL))
                .andExpect(content().string(containsString("fonkod=A%26B")))
                .andRespond(withSuccess(PricingFixtures.read("tefas-empty.json"), MediaType.APPLICATION_JSON));

        provider.fetchPrices(Set.of("A&B"));

        server.verify();
    }
}
