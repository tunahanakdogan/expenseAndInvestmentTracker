package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClient;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** BIST ve ABD hisse/ETF araması: Yahoo Finance arama ucu (resmi değil). Hata olursa boş liste. */
@Component
class YahooSymbolSearch {

    private static final Logger log = LoggerFactory.getLogger(YahooSymbolSearch.class);
    private static final String URL = "https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=10&newsCount=0";
    private static final Set<String> QUOTE_TYPES = Set.of("EQUITY", "ETF");
    private static final Set<String> US_EXCHANGES = Set.of("NMS", "NGM", "NCM", "NYQ", "ASE", "PCX", "BTS");

    private final RestClient restClient;

    YahooSymbolSearch(@Qualifier("pricingRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    List<Instrument> search(String query) {
        try {
            // Yahoo Türkçe karakterli sorguda sonuç vermiyor ("türk hava" → boş, "turk hava" → THYAO).
            String body = restClient.get().uri(URL, SearchText.normalize(query)).retrieve().body(String.class);
            if (body == null) {
                return List.of();
            }
            List<Instrument> result = new ArrayList<>();
            for (JsonNode quote : PricingJson.parse(body).path("quotes")) {
                toInstrument(quote).ifPresent(result::add);
            }
            return result;
        } catch (RestClientException | JacksonException e) {
            log.warn("Yahoo araması başarısız: {}", e.getClass().getSimpleName());
            return List.of();
        }
    }

    private static Optional<Instrument> toInstrument(JsonNode quote) {
        String symbol = quote.path("symbol").asString("");
        String exchange = quote.path("exchange").asString("");
        if (symbol.isEmpty() || !QUOTE_TYPES.contains(quote.path("quoteType").asString(""))) {
            return Optional.empty();
        }
        String name = quote.path("longname").asString(quote.path("shortname").asString(symbol));
        String display = quote.path("exchDisp").asString(exchange);
        if ("IST".equals(exchange) && symbol.endsWith(".IS")) {
            return Optional.of(new Instrument(AssetType.BIST_STOCK,
                    symbol.substring(0, symbol.length() - 3), name, display));
        }
        if (US_EXCHANGES.contains(exchange)) {
            return Optional.of(new Instrument(AssetType.US_STOCK, symbol, name, display));
        }
        return Optional.empty();
    }
}
