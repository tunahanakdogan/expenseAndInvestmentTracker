package com.tunahan.finans.pricing;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.TestAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@Transactional
class PricingControllerTest {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    ExchangeRateRepository rates;

    @Test
    void returnsRateAsString() {
        rates.save(new ExchangeRate("USD", LocalDate.parse("2026-11-14"), new BigDecimal("34.12340000"), "TEST", Instant.now()));

        assertThat(mvc.get().uri("/api/pricing/rate?currency=USD&date=2026-11-16").header("Authorization", TestAuth.bearer(mvc)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"currency": "USD", "date": "2026-11-14", "rateTry": "34.12340000"}
                        """);
    }

    @Test
    void missingRateIs404ProblemDetail() {
        assertThat(mvc.get().uri("/api/pricing/rate?currency=EUR&date=2026-11-16").header("Authorization", TestAuth.bearer(mvc)))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson().extractingPath("$.detail").isEqualTo("EUR için 16.11.2026 veya öncesine ait kur bulunamadı");
    }

    @Test
    void requiresToken() {
        assertThat(mvc.get().uri("/api/pricing/rate?currency=USD&date=2026-11-16")).hasStatus(HttpStatus.UNAUTHORIZED);
    }
}
