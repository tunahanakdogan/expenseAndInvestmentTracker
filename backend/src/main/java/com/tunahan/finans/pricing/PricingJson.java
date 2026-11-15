package com.tunahan.finans.pricing;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.Optional;

/** Sağlayıcı yanıtları için ortak JSON yardımcısı; ondalıklar {@code BigDecimal} okunur. */
final class PricingJson {

    /** NUMBER(19,8) sütununa sığmayan değerler (>= 1e11) geçersiz sayılır. */
    private static final BigDecimal MAX_EXCLUSIVE = new BigDecimal("1e11");
    /** 8 haneye yuvarlanınca 0 olacak kadar küçük değerler geçersiz sayılır. */
    private static final BigDecimal MIN = new BigDecimal("1e-8");

    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .build();

    private PricingJson() {
    }

    /** Geçersiz JSON'da {@code tools.jackson.core.JacksonException} (unchecked) fırlatır. */
    static JsonNode parse(String json) {
        return MAPPER.readTree(json);
    }

    /**
     * Yalnızca sayı ve [1e-8, 1e11) aralığındaysa değer; null, metin, 0, negatif ve aşırı
     * büyük/küçük (uç üslü) değerler boş döner.
     */
    static Optional<BigDecimal> positive(JsonNode node) {
        if (node == null || !node.isNumber()) {
            return Optional.empty();
        }
        BigDecimal value = node.decimalValue();
        if (value.signum() <= 0 || value.compareTo(MIN) < 0 || value.compareTo(MAX_EXCLUSIVE) >= 0) {
            return Optional.empty();
        }
        return Optional.of(value);
    }
}
