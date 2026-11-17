package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class YahooSymbolSearchTest {

    private static final String URL = "https://query2.finance.yahoo.com/v1/finance/search";

    private MockRestServiceServer server;
    private YahooSymbolSearch search;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        search = new YahooSymbolSearch(builder.build());
    }

    /** Yahoo Türkçe karakterli sorguda ("türk hava") sonuç döndürmüyor; sadeleştirilmiş sorgu gider. */
    @Test
    void mapsBistAndUsListingsAndDropsOthers() {
        server.expect(requestTo(startsWith(URL)))
                .andExpect(queryParam("q", "turk%20hava"))
                .andExpect(queryParam("newsCount", "0"))
                .andRespond(withSuccess(PricingFixtures.read("yahoo-search.json"), MediaType.APPLICATION_JSON));

        assertThat(search.search("türk hava")).containsExactly(
                new Instrument(AssetType.BIST_STOCK, "THYAO", "Türk Hava Yollari Anonim Ortakligi", "IST"),
                new Instrument(AssetType.US_STOCK, "AAPL", "Apple Inc.", "NASDAQ"),
                new Instrument(AssetType.US_STOCK, "SPY", "SPDR S&P 500", "NYSEArca"),
                new Instrument(AssetType.BIST_STOCK, "ISCTR", "ISBANK", "IST"));
    }

    @Test
    void httpErrorGivesEmptyList() {
        server.expect(requestTo(startsWith(URL))).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThat(search.search("apple")).isEmpty();
    }

    @Test
    void networkErrorGivesEmptyList() {
        server.expect(requestTo(startsWith(URL))).andRespond(withException(new SocketTimeoutException()));

        assertThat(search.search("apple")).isEmpty();
    }

    @Test
    void nonJsonBodyGivesEmptyList() {
        server.expect(requestTo(startsWith(URL))).andRespond(withSuccess("<html></html>", MediaType.TEXT_HTML));

        assertThat(search.search("apple")).isEmpty();
    }
}
