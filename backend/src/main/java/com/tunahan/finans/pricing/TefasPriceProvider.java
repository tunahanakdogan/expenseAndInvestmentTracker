package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Yatırım fonları: TEFAS geçmiş fiyat ucu; son 7 günün en yeni tarihli FIYAT değeri. */
@Component
class TefasPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(TefasPriceProvider.class);
    private static final String URL = "https://www.tefas.gov.tr/api/DB/BindHistoryInfo";
    private static final DateTimeFormatter TR_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final RestClient restClient;
    private final PricingClock clock;

    TefasPriceProvider(@Qualifier("pricingRestClient") RestClient restClient, PricingClock clock) {
        this.restClient = restClient;
        this.clock = clock;
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
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("fontip", "YAT");
        form.add("fonkod", fundCode);
        form.add("bastarih", TR_DATE.format(clock.today().minusDays(7)));
        form.add("bittarih", TR_DATE.format(clock.today()));
        try {
            String body = restClient.post().uri(URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve().body(String.class);
            if (body == null) {
                return Optional.empty();
            }
            long latestDate = Long.MIN_VALUE;
            BigDecimal latestPrice = null;
            for (JsonNode row : PricingJson.parse(body).path("data")) {
                long date = row.path("TARIH").asLong(Long.MIN_VALUE);
                Optional<BigDecimal> price = PricingJson.positive(row.path("FIYAT"));
                if (date != Long.MIN_VALUE && price.isPresent() && date > latestDate) {
                    latestDate = date;
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
}
