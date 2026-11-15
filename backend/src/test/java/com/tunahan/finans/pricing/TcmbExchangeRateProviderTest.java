package com.tunahan.finans.pricing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TcmbExchangeRateProviderTest {

    private static final String URL = "https://www.tcmb.gov.tr/kurlar/today.xml";

    private MockRestServiceServer server;
    private TcmbExchangeRateProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new TcmbExchangeRateProvider(builder.build());
    }

    @Test
    void parsesForexSellingPerUnit() {
        server.expect(requestTo(URL)).andRespond(withSuccess(PricingFixtures.read("tcmb-today.xml"), MediaType.APPLICATION_XML));

        Map<String, BigDecimal> rates = provider.fetchRates();

        assertThat(rates.get("USD")).isEqualByComparingTo("34.1234");
        assertThat(rates.get("EUR")).isEqualByComparingTo("36.5678");
        assertThat(rates.get("JPY")).isEqualByComparingTo("0.221234");
        assertThat(rates).doesNotContainKey("XDR");
        assertThat(provider.source()).isEqualTo("TCMB");
    }

    @Test
    void httpErrorReturnsEmptyMap() {
        server.expect(requestTo(URL)).andRespond(withServerError());

        assertThat(provider.fetchRates()).isEmpty();
    }

    @Test
    void timeoutReturnsEmptyMap() {
        server.expect(requestTo(URL)).andRespond(withException(new SocketTimeoutException()));

        assertThat(provider.fetchRates()).isEmpty();
    }

    @Test
    void malformedXmlReturnsEmptyMap() {
        server.expect(requestTo(URL)).andRespond(withSuccess("<html>hata</html>", MediaType.TEXT_HTML));

        assertThat(provider.fetchRates()).isEmpty();
    }

    @Test
    void doctypeIsRejected() {
        server.expect(requestTo(URL)).andRespond(withSuccess(PricingFixtures.read("tcmb-doctype.xml"), MediaType.APPLICATION_XML));

        assertThat(provider.fetchRates()).isEmpty();
    }
}
