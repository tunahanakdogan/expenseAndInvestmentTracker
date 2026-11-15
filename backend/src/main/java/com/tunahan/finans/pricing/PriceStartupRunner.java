package com.tunahan.finans.pricing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Açılışta bugünün kuru yoksa çeker. Kontrol ve çekim ayrı thread'de yapılır: uygulama açılışı
 * ne dış çağrıyı ne de veritabanı hatasını bekler.
 */
@Component
@ConditionalOnProperty(name = "app.pricing.enabled", havingValue = "true", matchIfMissing = true)
class PriceStartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PriceStartupRunner.class);

    private final PriceRefreshService service;
    private final PriceWriter writer;

    PriceStartupRunner(PriceRefreshService service, PriceWriter writer) {
        this.service = service;
        this.writer = writer;
    }

    @Override
    public void run(ApplicationArguments args) {
        Thread.ofVirtual().name("pricing-startup").start(() -> {
            try {
                if (!writer.hasRatesForToday()) {
                    service.refreshRates();
                }
            } catch (RuntimeException e) {
                log.warn("Açılış kur yenilemesi başarısız: {}", e.getClass().getSimpleName());
            }
        });
    }
}
