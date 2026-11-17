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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TefasPriceProviderTest {

    private static final String URL = "https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir";

    private MockRestServiceServer server;
    private TefasPriceProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new TefasPriceProvider(builder.build());
    }

    private void respond(String body) {
        server.expect(requestTo(URL)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void picksPriceOfLatestDateForRequestedFund() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                // TEFAS chunked (Content-Length'siz) isteğe 500 dönüyor
                .andExpect(header("Content-Length", "40"))
                .andExpect(content().json("{\"fonKodu\":\"AFT\",\"dil\":\"TR\",\"periyod\":1}"))
                .andRespond(withSuccess(PricingFixtures.read("tefas-aft.json"), MediaType.APPLICATION_JSON));

        var prices = provider.fetchPrices(Set.of("AFT"));

        assertThat(prices).containsOnlyKeys("AFT");
        assertThat(prices.get("AFT")).isEqualByComparingTo("0.523456");
        assertThat(provider.supports(AssetType.FUND)).isTrue();
        assertThat(provider.supports(AssetType.GOLD)).isFalse();
        assertThat(provider.source()).isEqualTo("TEFAS");
    }

    @Test
    void emptyResultIsOmitted() {
        respond(PricingFixtures.read("tefas-empty.json"));

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void errorMessageIsOmitted() {
        respond("{\"errorCode\":\"E1\",\"errorMessage\":\"Sistem Hatası!!\"}");

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void nonJsonBodyIsOmitted() {
        respond("<html>bakımda</html>");

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void zeroPriceAndBadDateAreIgnored() {
        respond("""
                {"resultList":[
                  {"fonKodu":"AFT","tarih":"2026-11-13","fiyat":0},
                  {"fonKodu":"AFT","tarih":"13.11.2026","fiyat":1.5},
                  {"fonKodu":"AFT","fiyat":1.6}
                ]}
                """);

        assertThat(provider.fetchPrices(Set.of("AFT"))).isEmpty();
    }

    @Test
    void httpErrorIsOmittedAndOthersContinue() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.NOT_FOUND));
        respond(PricingFixtures.read("tefas-aft.json"));

        assertThat(provider.fetchPrices(new LinkedHashSet<>(List.of("AAA", "AFT")))).containsOnlyKeys("AFT");
    }

    @Test
    void networkErrorStopsRemainingSymbols() {
        server.expect(ExpectedCount.once(), requestTo(URL)).andRespond(withException(new SocketTimeoutException()));

        assertThat(provider.fetchPrices(Set.of("A", "B", "C"))).isEmpty();
        server.verify();
    }

    @Test
    void fundCodeIsJsonEscaped() {
        server.expect(requestTo(URL))
                .andExpect(content().json("{\"fonKodu\":\"A\\\"B\",\"dil\":\"TR\",\"periyod\":1}"))
                .andRespond(withSuccess(PricingFixtures.read("tefas-empty.json"), MediaType.APPLICATION_JSON));

        provider.fetchPrices(Set.of("A\"B"));

        server.verify();
    }
}
