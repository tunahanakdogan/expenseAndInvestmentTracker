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

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TefasFundCatalogTest {

    private static final String URL = "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir";

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-17T09:00:00Z"));
    private MockRestServiceServer server;
    private TefasFundCatalog catalog;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        Clock clock = new Clock() {
            @Override
            public ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return now.get();
            }
        };
        catalog = new TefasFundCatalog(builder.build(), new PricingClock(clock));
    }

    private void respondFunds(ExpectedCount count) {
        server.expect(count, requestTo(URL))
                .andRespond(withSuccess(PricingFixtures.read("tefas-funds.json"), MediaType.APPLICATION_JSON));
    }

    @Test
    void findsFundsByCodePrefixOrNameWordsOncePerFund() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Length", notNullValue()))
                .andExpect(content().string(containsString("\"fonTipi\":\"YAT\"")))
                .andExpect(content().string(containsString("\"basTarih\":\"20261110\"")))
                .andExpect(content().string(containsString("\"bitTarih\":\"20261117\"")))
                .andRespond(withSuccess(PricingFixtures.read("tefas-funds.json"), MediaType.APPLICATION_JSON));

        assertThat(catalog.search("af")).containsExactly(
                new Instrument(AssetType.FUND, "AFT", "AK PORTFÖY YENİ TEKNOLOJİLER YABANCI HİSSE SENEDİ FONU", "TEFAS"));
        assertThat(catalog.search("is portfoy banka")).extracting(Instrument::symbol).containsExactly("IPB");
        assertThat(catalog.search("portföy")).extracting(Instrument::symbol).containsExactly("AAL", "AFT", "IPB");
    }

    @Test
    void listIsFetchedOncePerDay() {
        respondFunds(ExpectedCount.once());
        catalog.search("ata");
        catalog.search("ak");
        server.verify();

        server.reset();
        now.set(now.get().plus(Duration.ofDays(1)));
        respondFunds(ExpectedCount.once());
        catalog.search("ata");
        server.verify();
    }

    @Test
    void failureIsNotCachedAndIsRetriedOnNextSearch() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        respondFunds(ExpectedCount.once());

        assertThat(catalog.search("ata")).isEmpty();
        assertThat(catalog.search("ata")).extracting(Instrument::symbol).containsExactly("AAL");
    }
}
