package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

/** Bir fiyat kaynağı. Başarısız semboller sonuç haritasında yer almaz; istisna fırlatılmaz. */
interface PriceProvider {

    boolean supports(AssetType type);

    Map<String, BigDecimal> fetchPrices(Set<String> symbols);

    /** {@code price_history.source} değeri. */
    String source();
}
