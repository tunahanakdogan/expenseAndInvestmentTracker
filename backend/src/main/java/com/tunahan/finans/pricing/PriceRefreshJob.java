package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

/** Zamanlanmis fiyat/kur yenilemeleri (Europe/Istanbul). Zamanlama yalniz app.pricing.enabled iken calisir. */
@Component
class PriceRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(PriceRefreshJob.class);

    private final PriceRefreshService service;

    PriceRefreshJob(PriceRefreshService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 45 15 * * MON-FRI", zone = "Europe/Istanbul")
    @Scheduled(cron = "0 30 16 * * MON-FRI", zone = "Europe/Istanbul")
    void refreshRates() {
        run("kur", service::refreshRates);
    }

    @Scheduled(cron = "0 0 10-23 * * MON-FRI", zone = "Europe/Istanbul")
    void refreshMarketPrices() {
        run("piyasa fiyatlari",
                () -> service.refreshPrices(Set.of(AssetType.BIST_STOCK, AssetType.US_STOCK, AssetType.GOLD)));
    }

    @Scheduled(cron = "0 30 19 * * MON-FRI", zone = "Europe/Istanbul")
    void refreshFunds() {
        run("fon fiyatlari", () -> service.refreshPrices(Set.of(AssetType.FUND)));
    }

    private void run(String what, Runnable task) {
        try {
            task.run();
        } catch (RuntimeException e) {
            log.warn("Zamanlanmis {} yenilemesi basarisiz", what, e);
        }
    }
}
