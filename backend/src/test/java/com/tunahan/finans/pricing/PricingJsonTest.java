package com.tunahan.finans.pricing;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.node.DecimalNode;
import tools.jackson.databind.node.StringNode;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PricingJsonTest {

    @Test
    void acceptsNormalPositiveNumbers() {
        assertThat(PricingJson.positive(PricingJson.parse("{\"c\":312.5}").path("c"))).contains(new BigDecimal("312.5"));
    }

    @Test
    void rejectsZeroNegativeAndNonNumbers() {
        assertThat(PricingJson.positive(PricingJson.parse("{\"c\":0}").path("c"))).isEmpty();
        assertThat(PricingJson.positive(PricingJson.parse("{\"c\":-1}").path("c"))).isEmpty();
        assertThat(PricingJson.positive(StringNode.valueOf("12"))).isEmpty();
        assertThat(PricingJson.positive(null)).isEmpty();
    }

    @Test
    void rejectsValuesThatDoNotFitNumber19_8() {
        assertThat(PricingJson.positive(DecimalNode.valueOf(new BigDecimal("1e11")))).isEmpty();
        assertThat(PricingJson.positive(DecimalNode.valueOf(new BigDecimal("99999999999.99999999")))).isPresent();
    }

    @Test
    void rejectsHugeAndTinyExponentsWithoutBlowingUp() {
        assertThat(PricingJson.positive(DecimalNode.valueOf(new BigDecimal("1e999999999")))).isEmpty();
        assertThat(PricingJson.positive(DecimalNode.valueOf(new BigDecimal("1e-999999999")))).isEmpty();
    }
}
