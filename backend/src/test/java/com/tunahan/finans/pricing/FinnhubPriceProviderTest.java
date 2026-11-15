package com.tunahan.finans.pricing;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
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

class FinnhubPriceProviderTest {

    private static final String BASE = "https://finnhub.io/api/v1/quote?symbol=";

    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();
    private final Logger logger = (Logger) LoggerFactory.getLogger(FinnhubPriceProvider.class);
    private MockRestServiceServer server;
    private RestClient.Builder builder;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(logs);
    }

    private FinnhubPriceProvider provider(String key) {
        return new FinnhubPriceProvider(builder.build(), key);
    }

    @Test
    void parsesCurrentPrice() {
        server.expect(requestTo(BASE + "AAPL&token=test-key"))
                .andRespond(withSuccess(PricingFixtures.read("finnhub-aapl.json"), MediaType.APPLICATION_JSON));
        FinnhubPriceProvider provider = provider("test-key");

        var prices = provider.fetchPrices(Set.of("AAPL"));

        assertThat(prices).containsOnlyKeys("AAPL");
        assertThat(prices.get("AAPL")).isEqualByComparingTo("189.84");
        assertThat(provider.supports(AssetType.US_STOCK)).isTrue();
        assertThat(provider.supports(AssetType.BIST_STOCK)).isFalse();
        assertThat(provider.source()).isEqualTo("FINNHUB");
    }

    @Test
    void zeroCurrentPriceIsIgnored() {
        server.expect(requestTo(BASE + "AAPL&token=test-key"))
                .andRespond(withSuccess(PricingFixtures.read("finnhub-zero.json"), MediaType.APPLICATION_JSON));

        assertThat(provider("test-key").fetchPrices(Set.of("AAPL"))).isEmpty();
    }

    @Test
    void negativeAndNonNumericPricesAreIgnored() {
        server.expect(requestTo(BASE + "AAPL&token=test-key"))
                .andRespond(withSuccess("{\"c\":-5}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(BASE + "MSFT&token=test-key"))
                .andRespond(withSuccess("{\"c\":\"abc\"}", MediaType.APPLICATION_JSON));

        assertThat(provider("test-key").fetchPrices(new LinkedHashSet<>(List.of("AAPL", "MSFT")))).isEmpty();
    }

    @Test
    void hugeExponentPriceIsIgnored() {
        server.expect(requestTo(BASE + "AAPL&token=test-key"))
                .andRespond(withSuccess("{\"c\":1e999999999}", MediaType.APPLICATION_JSON));

        assertThat(provider("test-key").fetchPrices(Set.of("AAPL"))).isEmpty();
    }

    @Test
    void htmlBodyIsOmitted() {
        server.expect(requestTo(BASE + "AAPL&token=test-key"))
                .andRespond(withSuccess("<html>hata</html>", MediaType.TEXT_HTML));

        assertThat(provider("test-key").fetchPrices(Set.of("AAPL"))).isEmpty();
    }

    @Test
    void blankApiKeySkipsWithoutAnyRequestAndWarnsOnce() {
        FinnhubPriceProvider provider = provider("");

        assertThat(provider.fetchPrices(Set.of("AAPL"))).isEmpty();
        assertThat(provider.fetchPrices(Set.of("AAPL"))).isEmpty();

        server.verify();
        assertThat(logs.list).hasSize(1);
    }

    @Test
    void symbolWithAmpersandIsEncoded() {
        server.expect(requestTo(BASE + "A%26B&token=test-key"))
                .andRespond(withSuccess(PricingFixtures.read("finnhub-aapl.json"), MediaType.APPLICATION_JSON));

        assertThat(provider("test-key").fetchPrices(Set.of("A&B"))).containsOnlyKeys("A&B");
        server.verify();
    }

    @Test
    void httpErrorIsOmittedAndOthersContinue() {
        server.expect(requestTo(BASE + "AAPL&token=test-key")).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(requestTo(BASE + "MSFT&token=test-key"))
                .andRespond(withSuccess(PricingFixtures.read("finnhub-aapl.json"), MediaType.APPLICATION_JSON));

        assertThat(provider("test-key").fetchPrices(new LinkedHashSet<>(List.of("AAPL", "MSFT")))).containsOnlyKeys("MSFT");
    }

    @Test
    void networkErrorStopsRemainingSymbols() {
        server.expect(ExpectedCount.once(), requestTo(startsWith(BASE)))
                .andRespond(withException(new SocketTimeoutException()));

        assertThat(provider("test-key").fetchPrices(Set.of("A", "B", "C"))).isEmpty();
        server.verify();
    }

    @Test
    void apiKeyNeverAppearsInLogs() {
        server.expect(requestTo(BASE + "AAPL&token=test-key")).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        server.expect(requestTo(BASE + "MSFT&token=test-key")).andRespond(withException(new SocketTimeoutException("test-key")));

        provider("test-key").fetchPrices(new LinkedHashSet<>(List.of("AAPL", "MSFT")));

        assertThat(logs.list).isNotEmpty();
        assertThat(logs.list).allSatisfy(e -> assertThat(e.getFormattedMessage()).doesNotContain("test-key"));
        assertThat(logs.list).allSatisfy(e -> assertThat(e.getThrowableProxy()).isNull());
    }
}
