package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Yatırım fonları: TEFAS fon fiyat ucu (son 1 ayın günlük fiyatları); en yeni tarihli fiyat alınır.
 * Eski /api/DB/BindHistoryInfo ucu Kasım 2026'da kapatıldı (ERR-006 "Method not found or disabled").
 */
@Component
class TefasPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(TefasPriceProvider.class);
    private static final String URL = "https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final RestClient restClient;

    TefasPriceProvider(@Qualifier("pricingRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public boolean supports(AssetType type) {
        return type == AssetType.FUND;
    }

    @Override
    public Map<String, BigDecimal> fetchPrices(Set<String> symbols) {
        Map<String, BigDecimal> prices = new LinkedHashMap<>();
        for (String symbol : symbols) {
            try {
                latestPrice(symbol).ifPresent(p -> prices.put(symbol, p));
            } catch (ResourceAccessException e) {
                log.warn("TEFAS erişilemiyor, kalan fonlar atlandı");
                break;
            }
        }
        return prices;
    }

    @Override
    public String source() {
        return "TEFAS";
    }

    private Optional<BigDecimal> latestPrice(String fundCode) {
        try {
            // Gövde String olarak gider: Content-Length dolu olur. TEFAS chunked isteğe 500 dönüyor.
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("fonKodu", fundCode);
            request.put("dil", "TR");
            request.put("periyod", 1);
            String body = restClient.post().uri(URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(JSON.writeValueAsString(request))
                    .retrieve().body(String.class);
            if (body == null) {
                return Optional.empty();
            }
            JsonNode root = PricingJson.parse(body);
            if (!root.path("errorMessage").isNull() && !root.path("errorMessage").isMissingNode()) {
                log.warn("TEFAS {} hata döndü: {}", fundCode, root.path("errorMessage").asString());
                return Optional.empty();
            }
            LocalDate latestDate = null;
            BigDecimal latestPrice = null;
            for (JsonNode row : root.path("resultList")) {
                if (!fundCode.equals(row.path("fonKodu").asString())) {
                    continue;
                }
                Optional<LocalDate> date = isoDate(row.path("tarih"));
                Optional<BigDecimal> price = PricingJson.positive(row.path("fiyat"));
                if (date.isPresent() && price.isPresent() && (latestDate == null || date.get().isAfter(latestDate))) {
                    latestDate = date.get();
                    latestPrice = price.get();
                }
            }
            if (latestPrice == null) {
                log.warn("TEFAS {} için geçerli fiyat dönmedi", fundCode);
            }
            return Optional.ofNullable(latestPrice);
        } catch (ResourceAccessException e) {
            throw e;
        } catch (RestClientException | JacksonException e) {
            log.warn("TEFAS {} alınamadı: {}", fundCode, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static Optional<LocalDate> isoDate(JsonNode node) {
        try {
            return node.isString() ? Optional.of(LocalDate.parse(node.asString())) : Optional.empty();
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }
}
