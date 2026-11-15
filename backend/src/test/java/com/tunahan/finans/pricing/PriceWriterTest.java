package com.tunahan.finans.pricing;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/** Eşzamanlılık testi commit gerektirdiği için @Transactional değil; veri kendi temizlenir. */
@IntegrationTest
class PriceWriterTest {

    @Autowired
    PriceWriter writer;
    @Autowired
    PriceQueryService queries;
    @Autowired
    PricingClock clock;
    @Autowired
    PriceHistoryRepository history;
    @Autowired
    ExchangeRateRepository rates;

    @BeforeEach
    @AfterEach
    void clean() {
        history.deleteAll();
        rates.deleteAll();
    }

    @Test
    void savePriceTwiceSameDayKeepsLastValueInOneRow() {
        writer.savePrice(AssetType.BIST_STOCK, "THYAO", new BigDecimal("312.12345678"), "TRY", "YAHOO");
        writer.savePrice(AssetType.BIST_STOCK, "THYAO", new BigDecimal("315.5"), "TRY", "YAHOO");

        assertThat(history.count()).isEqualTo(1);
        assertThat(queries.latestPrice(AssetType.BIST_STOCK, "THYAO").orElseThrow().price()).isEqualByComparingTo("315.5");
        assertThat(history.findAll().get(0).getPriceDate()).isEqualTo(clock.today());
    }

    @Test
    void differentTypesSameSymbolAreSeparateRows() {
        writer.savePrice(AssetType.BIST_STOCK, "AAA", BigDecimal.ONE, "TRY", "YAHOO");
        writer.savePrice(AssetType.US_STOCK, "AAA", BigDecimal.TEN, "USD", "FINNHUB");

        assertThat(history.count()).isEqualTo(2);
    }

    @Test
    void saveRateUpsertsAndIsReadableViaRateToTry() {
        assertThat(writer.hasRatesForToday()).isFalse();

        writer.saveRate("USD", new BigDecimal("34.1234"), "TCMB");
        writer.saveRate("USD", new BigDecimal("34.2000"), "TCMB");

        assertThat(rates.count()).isEqualTo(1);
        assertThat(queries.rateToTry("USD", clock.today()).orElseThrow()).isEqualByComparingTo("34.2");
        assertThat(writer.hasRatesForToday()).isTrue();
    }

    @Test
    void concurrentWritesToSameKeyDoNotFail() throws Exception {
        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            BigDecimal price = BigDecimal.valueOf(100 + i);
            futures.add(pool.submit(() -> {
                start.await();
                writer.savePrice(AssetType.BIST_STOCK, "RACE", price, "TRY", "YAHOO");
                writer.saveRate("EUR", price, "TCMB");
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        pool.shutdown();

        assertThat(history.count()).isEqualTo(1);
        assertThat(rates.count()).isEqualTo(1);
    }

    @Test
    void priceIsStoredWithEightDecimals() {
        writer.savePrice(AssetType.FUND, "AFT", new BigDecimal("0.123456789"), "TRY", "TEFAS");

        assertThat(queries.latestPrice(AssetType.FUND, "AFT").orElseThrow().price()).isEqualByComparingTo("0.12345679");
    }
}
