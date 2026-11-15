package com.tunahan.finans.common;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class JsonConfigTest {

    record Amount(BigDecimal value) {
    }

    private final JsonMapper mapper = configuredMapper();

    @Test
    void writesBigDecimalAsPlainString() {
        assertThat(mapper.writeValueAsString(new Amount(new BigDecimal("1234.5600"))))
                .isEqualTo("{\"value\":\"1234.5600\"}");
        assertThat(mapper.writeValueAsString(new Amount(new BigDecimal("1E+3"))))
                .isEqualTo("{\"value\":\"1000\"}");
    }

    @Test
    void readsBigDecimalFromString() {
        assertThat(mapper.readValue("{\"value\":\"12.5\"}", Amount.class).value()).isEqualByComparingTo("12.5");
    }

    private static JsonMapper configuredMapper() {
        JsonMapper.Builder builder = JsonMapper.builder();
        new JsonConfig().bigDecimalAsString().customize(builder);
        return builder.build();
    }
}
