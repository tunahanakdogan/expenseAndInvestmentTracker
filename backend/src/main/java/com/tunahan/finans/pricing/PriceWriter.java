package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;

/**
 * price_history / exchange_rate için (tür, sembol, gün) başına upsert; gün içinde son değer kalır.
 * Her yazma kendi transaction'ında; eşzamanlı insert yarışında (unique ihlali) bir kez yeniden okuyup günceller.
 */
@Component
class PriceWriter {

    private final PriceHistoryRepository history;
    private final ExchangeRateRepository rates;
    private final PricingClock clock;
    private final TransactionTemplate tx;

    PriceWriter(PriceHistoryRepository history, ExchangeRateRepository rates, PricingClock clock,
                PlatformTransactionManager txManager) {
        this.history = history;
        this.rates = rates;
        this.clock = clock;
        this.tx = new TransactionTemplate(txManager);
    }

    void savePrice(AssetType type, String symbol, BigDecimal price, String currency, String source) {
        BigDecimal value = scale(price);
        LocalDate date = clock.today();
        Instant now = clock.now();
        withOneRetry(() -> tx.executeWithoutResult(status ->
                history.findByAssetTypeAndSymbolAndPriceDate(type, symbol, date).ifPresentOrElse(
                        existing -> existing.update(value, source, now),
                        () -> history.save(new PriceHistory(type, symbol, date, value, currency, source, now)))));
    }

    void saveRate(String currency, BigDecimal rateTry, String source) {
        BigDecimal value = scale(rateTry);
        LocalDate date = clock.today();
        Instant now = clock.now();
        withOneRetry(() -> tx.executeWithoutResult(status ->
                rates.findByCurrencyAndRateDate(currency, date).ifPresentOrElse(
                        existing -> existing.update(value, source, now),
                        () -> rates.save(new ExchangeRate(currency, date, value, source, now)))));
    }

    boolean hasRatesForToday() {
        return rates.existsByRateDate(clock.today());
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(8, RoundingMode.HALF_EVEN);
    }

    private static void withOneRetry(Runnable write) {
        try {
            write.run();
        } catch (DataIntegrityViolationException e) {
            write.run();
        }
    }
}
