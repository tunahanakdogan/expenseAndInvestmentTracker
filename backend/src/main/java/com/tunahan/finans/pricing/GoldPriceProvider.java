package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Gram altın (TL): Yahoo GC=F (ons USD) × USD/TRY ÷ 31.1035. Yalnızca "GRAM" sembolü. */
@Component
class GoldPriceProvider implements PriceProvider {

    static final String GRAM = "GRAM";
    private static final Logger log = LoggerFactory.getLogger(GoldPriceProvider.class);
    private static final BigDecimal GRAMS_PER_OUNCE = new BigDecimal("31.1035");

    private final YahooChartClient yahoo;
    private final PriceQueryService prices;
    private final PricingClock clock;

    GoldPriceProvider(YahooChartClient yahoo, PriceQueryService prices, PricingClock clock) {
        this.yahoo = yahoo;
        this.prices = prices;
        this.clock = clock;
    }

    /** Önce çarp, sonra böl; ölçek 8, HALF_EVEN. */
    static BigDecimal gramTry(BigDecimal ouncesUsd, BigDecimal usdTry) {
        return ouncesUsd.multiply(usdTry).divide(GRAMS_PER_OUNCE, 8, RoundingMode.HALF_EVEN);
    }

    @Override
    public boolean supports(AssetType type) {
        return type == AssetType.GOLD;
    }

    @Override
    public Map<String, BigDecimal> fetchPrices(Set<String> symbols) {
        if (!symbols.contains(GRAM)) {
            return Map.of();
        }
        Optional<BigDecimal> usdTry = prices.rateToTry("USD", clock.today());
        if (usdTry.isEmpty()) {
            log.warn("USD/TRY kuru yok, gram altın hesaplanamadı");
            return Map.of();
        }
        try {
            return yahoo.regularMarketPrice("GC=F")
                    .map(ounce -> Map.of(GRAM, gramTry(ounce, usdTry.get())))
                    .orElse(Map.of());
        } catch (ResourceAccessException e) {
            log.warn("Yahoo erişilemiyor, gram altın alınamadı");
            return Map.of();
        }
    }

    @Override
    public String source() {
        return "GOLD";
    }
}
