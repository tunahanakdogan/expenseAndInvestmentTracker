package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/** Diğer modüllerin fiyat ve kur okuduğu tek giriş noktası. */
@Service
@Transactional(readOnly = true)
public class PriceQueryService {

    private final PriceHistoryRepository history;
    private final ExchangeRateRepository rates;

    PriceQueryService(PriceHistoryRepository history, ExchangeRateRepository rates) {
        this.history = history;
        this.rates = rates;
    }

    /** Döviz varlığının "fiyatı" en son TCMB kurudur (TL); diğerleri fiyat geçmişinden. */
    public Optional<PricePoint> latestPrice(AssetType type, String symbol) {
        if (type == AssetType.CURRENCY) {
            return rates.findFirstByCurrencyOrderByRateDateDesc(symbol)
                    .map(r -> new PricePoint(r.getRateTry(), "TRY", r.getRateDate()));
        }
        return history.findFirstByAssetTypeAndSymbolOrderByPriceDateDesc(type, symbol)
                .map(p -> new PricePoint(p.getPrice(), p.getCurrency(), p.getPriceDate()));
    }

    /** O gün kur yoksa (hafta sonu, tatil) önceki en yakın günün kuru. */
    public Optional<BigDecimal> rateToTry(String currency, LocalDate date) {
        if ("TRY".equals(currency)) {
            return Optional.of(BigDecimal.ONE);
        }
        return rates.findFirstByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency, date)
                .map(ExchangeRate::getRateTry);
    }

    Optional<ExchangeRate> rateRecord(String currency, LocalDate date) {
        return rates.findFirstByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency, date);
    }
}
