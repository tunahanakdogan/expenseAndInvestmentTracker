package com.tunahan.finans.common;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.StreamWriteFeature;

import java.math.BigDecimal;

@Configuration
class JsonConfig {

    /** Tutarlar API'de string ("1234.5600") gider ve gelir; frontend sayıya çevirip yuvarlamasın. */
    @Bean
    JsonMapperBuilderCustomizer bigDecimalAsString() {
        return builder -> builder
                .withConfigOverride(BigDecimal.class,
                        o -> o.setFormat(JsonFormat.Value.forShape(JsonFormat.Shape.STRING)))
                .enable(StreamWriteFeature.WRITE_BIGDECIMAL_AS_PLAIN);
    }
}
