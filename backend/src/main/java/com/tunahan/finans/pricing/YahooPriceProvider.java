package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** BIST hisseleri: Yahoo'da SEMBOL.IS. */
@Component
class YahooPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(YahooPriceProvider.class);

    private final YahooChartClient yahoo;

    YahooPriceProvider(YahooChartClient yahoo) {
        this.yahoo = yahoo;
    }

    @Override
    public boolean supports(AssetType type) {
        return type == AssetType.BIST_STOCK;
    }

    @Override
    public Map<String, BigDecimal> fetchPrices(Set<String> symbols) {
        Map<String, BigDecimal> prices = new LinkedHashMap<>();
        for (String symbol : symbols) {
            try {
                yahoo.regularMarketPrice(symbol + ".IS").ifPresent(p -> prices.put(symbol, p));
            } catch (ResourceAccessException e) {
                log.warn("Yahoo erisilemiyor, kalan BIST sembolleri atlandi");
                break;
            }
        }
        return prices;
    }

    @Override
    public String source() {
        return "YAHOO";
    }
}
