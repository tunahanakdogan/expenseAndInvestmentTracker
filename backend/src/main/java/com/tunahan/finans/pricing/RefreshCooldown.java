package com.tunahan.finans.pricing;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

/** Elle yenilemeler arasında en az 60 sn (Finnhub limitini korur). Atomik: eşzamanlı isteklerden yalnız biri geçer. */
@Component
class RefreshCooldown {

    static final Duration COOLDOWN = Duration.ofSeconds(60);

    private final PricingClock clock;
    private final AtomicReference<Instant> lastAccepted = new AtomicReference<>();

    RefreshCooldown(PricingClock clock) {
        this.clock = clock;
    }

    boolean tryAcquire() {
        Instant now = clock.now();
        while (true) {
            Instant last = lastAccepted.get();
            if (last != null && now.isBefore(last.plus(COOLDOWN))) {
                return false;
            }
            if (lastAccepted.compareAndSet(last, now)) {
                return true;
            }
        }
    }

    long retryAfterSeconds() {
        Instant last = lastAccepted.get();
        if (last == null) {
            return 0;
        }
        long remainingMillis = Duration.between(clock.now(), last.plus(COOLDOWN)).toMillis();
        return Math.max(0, (remainingMillis + 999) / 1000);
    }
}
