package com.tunahan.finans.pricing;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Fiyat/kur günü her zaman Europe/Istanbul takvimine göredir. */
@Component
class PricingClock {

    static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    private final Clock clock;

    @Autowired
    PricingClock() {
        this(Clock.system(ZONE));
    }

    PricingClock(Clock clock) {
        this.clock = clock;
    }

    LocalDate today() {
        return LocalDate.now(clock.withZone(ZONE));
    }

    Instant now() {
        return clock.instant();
    }
}
