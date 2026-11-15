package com.tunahan.finans.pricing;

import java.math.BigDecimal;
import java.util.Map;

/** Kur kaynağı: para birimi kodu → 1 birim kaç TL. Hata halinde boş harita döner. */
interface ExchangeRateProvider {

    Map<String, BigDecimal> fetchRates();

    String source();
}
