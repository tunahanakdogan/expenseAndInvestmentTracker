package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * TEFAS'taki tüm yatırım fonlarının kod → ad listesi; günde bir kez çekilir, bellekte tutulur.
 * Çekim başarısız olursa önbelleğe yazılmaz, bir sonraki aramada yeniden denenir.
 */
@Component
class TefasFundCatalog {

    private static final Logger log = LoggerFactory.getLogger(TefasFundCatalog.class);
    private static final String URL = "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir";
    private static final DateTimeFormatter COMPACT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final RestClient restClient;
    private final PricingClock clock;
    private volatile Cached cached;

    TefasFundCatalog(@Qualifier("pricingRestClient") RestClient restClient, PricingClock clock) {
        this.restClient = restClient;
        this.clock = clock;
    }

    List<Instrument> search(String query) {
        String code = SearchText.normalize(query);
        return funds().stream()
                .filter(f -> SearchText.normalize(f.symbol()).startsWith(code) || SearchText.matches(f.name(), query))
                .toList();
    }

    private List<Instrument> funds() {
        LocalDate today = clock.today();
        Cached current = cached;
        if (current != null && current.day().equals(today)) {
            return current.funds();
        }
        synchronized (this) {
            if (cached == null || !cached.day().equals(today)) {
                List<Instrument> fetched = fetch(today);
                if (fetched == null) {
                    return cached == null ? List.of() : cached.funds();
                }
                cached = new Cached(today, fetched);
            }
            return cached.funds();
        }
    }

    /** Başarısızlıkta null (önbelleğe yazılmasın diye). */
    private List<Instrument> fetch(LocalDate today) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("fonTipi", "YAT");
        request.put("fonKodu", null);
        request.put("aramaMetni", null);
        request.put("fonTurKod", null);
        request.put("fonGrubu", null);
        request.put("sfonTurKod", null);
        request.put("fonTurAciklama", null);
        request.put("kurucuKod", null);
        request.put("basTarih", COMPACT.format(today.minusDays(7)));
        request.put("bitTarih", COMPACT.format(today));
        request.put("basSira", 1);
        request.put("bitSira", 5000);
        request.put("dil", "TR");
        request.put("sFonTurKod", "");
        request.put("fonKod", "");
        request.put("fonGrup", "");
        request.put("fonUnvanTip", "");
        try {
            // Gövde String gider: Content-Length dolu olur. TEFAS chunked isteğe 500 dönüyor.
            String body = restClient.post().uri(URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(JSON.writeValueAsString(request))
                    .retrieve().body(String.class);
            if (body == null) {
                return null;
            }
            Map<String, Instrument> funds = new LinkedHashMap<>();
            for (JsonNode row : PricingJson.parse(body).path("resultList")) {
                String code = row.path("fonKodu").asString("");
                String name = row.path("fonUnvan").asString("");
                if (!code.isEmpty() && !name.isEmpty()) {
                    funds.putIfAbsent(code, new Instrument(AssetType.FUND, code, name, "TEFAS"));
                }
            }
            return funds.isEmpty() ? null : List.copyOf(funds.values());
        } catch (RestClientException | JacksonException e) {
            log.warn("TEFAS fon listesi alınamadı: {}", e.getClass().getSimpleName());
            return null;
        }
    }

    private record Cached(LocalDate day, List<Instrument> funds) {
    }
}
