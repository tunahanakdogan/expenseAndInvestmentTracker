package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

/** ABD hisseleri: Finnhub quote ucu, deger "c" (guncel fiyat). Anahtar ve URL asla loglanmaz. */
@Component
class FinnhubPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(FinnhubPriceProvider.class);
    private static final String URL = "https://finnhub.io/api/v1/quote?symbol={symbol}&token={token}";

    private final RestClient restClient;
    private final String apiKey;
    private final AtomicBoolean warnedMissingKey = new AtomicBoolean();

    FinnhubPriceProvider(@Qualifier("pricingRestClient") RestClient restClient,
                         @Value("${app.pricing.us-stock-api-key:}") String apiKey) {
        this.restClient = restClient;
        this.apiKey = apiKey;
    }

    @Override
    public boolean supports(AssetType type) {
        return type == AssetType.US_STOCK;
    }

    @Override
    public Map<String, BigDecimal> fetchPrices(Set<String> symbols) {
        Map<String, BigDecimal> prices = new LinkedHashMap<>();
        if (apiKey == null || apiKey.isBlank()) {
            if (warnedMissingKey.compareAndSet(false, true)) {
                log.warn("US_STOCK_API_KEY tanimli degil, ABD hisse fiyatlari atlaniyor");
            }
            return prices;
        }
        for (String symbol : symbols) {
            try {
                quote(symbol).ifPresent(p -> prices.put(symbol, p));
            } catch (ResourceAccessException e) {
                log.warn("Finnhub erisilemiyor, kalan ABD sembolleri atlandi");
                break;
            }
        }
        return prices;
    }

    @Override
    public String source() {
        return "FINNHUB";
    }

    private Optional<BigDecimal> quote(String symbol) {
        try {
            String body = restClient.get().uri(URL, symbol, apiKey).retrieve().body(String.class);
            Optional<BigDecimal> price = body == null
                    ? Optional.empty()
                    : PricingJson.positive(PricingJson.parse(body).path("c"));
            if (price.isEmpty()) {
                log.warn("Finnhub {} icin gecerli fiyat donmedi", symbol);
            }
            return price;
        } catch (ResourceAccessException e) {
            throw e;
        } catch (RestClientResponseException e) {
            log.warn("Finnhub {} alinamadi: HTTP {}", symbol, e.getStatusCode().value());
            return Optional.empty();
        } catch (RestClientException | JacksonException e) {
            log.warn("Finnhub {} alinamadi: {}", symbol, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
