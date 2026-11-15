package com.tunahan.finans.pricing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriUtils;
import tools.jackson.core.JacksonException;

import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/** Yahoo chart ucu; BIST ve altın sağlayıcıları ortak kullanır. */
@Component
class YahooChartClient {

    private static final Logger log = LoggerFactory.getLogger(YahooChartClient.class);
    private static final String BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

    private final RestClient restClient;

    YahooChartClient(@Qualifier("pricingRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    /** Sembol tek bir path segmenti olarak kodlanır; "/" gibi karakterler yola sızmaz. */
    static URI uri(String yahooSymbol) {
        return URI.create(BASE + UriUtils.encodePathSegment(yahooSymbol, StandardCharsets.UTF_8));
    }

    /**
     * {@code chart.result[0].meta.regularMarketPrice}. Ağ hatası ({@link ResourceAccessException}) çağırana
     * atılır ki sağlayıcı kalan sembolleri denemesin; sembole özgü hatalar boş döner.
     */
    Optional<BigDecimal> regularMarketPrice(String yahooSymbol) {
        try {
            String body = restClient.get().uri(uri(yahooSymbol)).retrieve().body(String.class);
            if (body == null) {
                return Optional.empty();
            }
            Optional<BigDecimal> price = PricingJson.positive(PricingJson.parse(body)
                    .path("chart").path("result").path(0).path("meta").path("regularMarketPrice"));
            if (price.isEmpty()) {
                log.warn("Yahoo {} için geçerli fiyat dönmedi", yahooSymbol);
            }
            return price;
        } catch (ResourceAccessException e) {
            throw e;
        } catch (RestClientException | JacksonException e) {
            log.warn("Yahoo {} alınamadı: {}", yahooSymbol, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
