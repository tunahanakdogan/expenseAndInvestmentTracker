package com.tunahan.finans.pricing;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.Optional;

/** Saglayici yanitlari icin ortak JSON yardimcisi; ondaliklar BigDecimal okunur. */
final class PricingJson {

    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .build();

    private PricingJson() {
    }

    /** Gecersiz JSON'da tools.jackson.core.JacksonException (unchecked) firlatir. */
    static JsonNode parse(String json) {
        return MAPPER.readTree(json);
    }

    /** Yalnizca sayi ve 0'dan buyukse deger; null, metin, 0 ve negatif bos doner. */
    static Optional<BigDecimal> positive(JsonNode node) {
        if (node == null || !node.isNumber()) {
            return Optional.empty();
        }
        BigDecimal value = node.decimalValue();
        return value.signum() > 0 ? Optional.of(value) : Optional.empty();
    }
}
