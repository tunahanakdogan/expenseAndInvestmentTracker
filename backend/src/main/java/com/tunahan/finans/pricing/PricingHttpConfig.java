package com.tunahan.finans.pricing;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
class PricingHttpConfig {

    static final String USER_AGENT = "finans-takip/0.0.1";

    @Bean("pricingRestClient")
    RestClient pricingRestClient() {
        return restClient(RestClient.builder(), Duration.ofSeconds(5), Duration.ofSeconds(10));
    }

    static RestClient restClient(RestClient.Builder builder, Duration connect, Duration read) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(connect)
                        .followRedirects(HttpClient.Redirect.NORMAL).build());
        factory.setReadTimeout(read);
        // Sıkıştırma istenince TCMB çözülemeyen bir gövde döndürüyor (ZipException: incorrect header check).
        factory.enableCompression(false);
        return builder.requestFactory(factory)
                .defaultHeader("User-Agent", USER_AGENT)
                .build();
    }

    @Configuration
    @EnableScheduling
    @ConditionalOnProperty(name = "app.pricing.enabled", havingValue = "true", matchIfMissing = true)
    static class SchedulingConfig {
    }
}
