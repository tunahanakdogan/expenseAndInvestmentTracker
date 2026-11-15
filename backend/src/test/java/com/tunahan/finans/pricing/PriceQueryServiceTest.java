package com.tunahan.finans.pricing;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@Transactional
class PriceQueryServiceTest {

    @Autowired
    PriceQueryService prices;
    @Autowired
    ExchangeRateRepository rates;
    @Autowired
    PriceHistoryRepository history;

    @Test
    void rateToTryUsesNearestPreviousDay() {
        rate("USD", "2026-11-13", "34.10000000");
        rate("USD", "2026-11-14", "34.25000000");

        assertThat(prices.rateToTry("USD", LocalDate.parse("2026-11-16"))).contains(new BigDecimal("34.25000000"));
        assertThat(prices.rateToTry("USD", LocalDate.parse("2026-11-13"))).contains(new BigDecimal("34.10000000"));
        assertThat(prices.rateToTry("USD", LocalDate.parse("2026-11-12"))).isEmpty();
        assertThat(prices.rateToTry("EUR", LocalDate.parse("2026-11-16"))).isEmpty();
    }

    @Test
    void rateToTryForTryIsOne() {
        assertThat(prices.rateToTry("TRY", LocalDate.parse("2000-01-01"))).contains(BigDecimal.ONE);
    }

    @Test
    void latestPriceReturnsMostRecentDay() {
        price(AssetType.BIST_STOCK, "THYAO", "2026-11-13", "300.50000000");
        price(AssetType.BIST_STOCK, "THYAO", "2026-11-14", "305.25000000");

        assertThat(prices.latestPrice(AssetType.BIST_STOCK, "THYAO"))
                .contains(new PricePoint(new BigDecimal("305.25000000"), "TRY", LocalDate.parse("2026-11-14")));
        assertThat(prices.latestPrice(AssetType.BIST_STOCK, "ASELS")).isEmpty();
    }

    @Test
    void latestPriceForCurrencyComesFromExchangeRates() {
        rate("EUR", "2026-11-13", "36.50000000");
        rate("EUR", "2026-11-14", "36.75000000");

        assertThat(prices.latestPrice(AssetType.CURRENCY, "EUR"))
                .contains(new PricePoint(new BigDecimal("36.75000000"), "TRY", LocalDate.parse("2026-11-14")));
    }

    private void rate(String currency, String date, String rateTry) {
        rates.save(new ExchangeRate(currency, LocalDate.parse(date), new BigDecimal(rateTry), "TEST", Instant.now()));
    }

    private void price(AssetType type, String symbol, String date, String value) {
        history.save(new PriceHistory(type, symbol, LocalDate.parse(date), new BigDecimal(value), "TRY", "TEST", Instant.now()));
    }
}
