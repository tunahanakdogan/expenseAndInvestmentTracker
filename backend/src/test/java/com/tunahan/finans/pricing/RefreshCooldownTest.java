package com.tunahan.finans.pricing;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicReference;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCooldownTest {

    /** Elle ilerletilen saat. */
    private static final class MutableClock extends Clock {
        final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-16T09:00:00Z"));

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now.get();
        }

        void advance(Duration d) {
            now.updateAndGet(i -> i.plus(d));
        }
    }

    private final MutableClock clock = new MutableClock();
    private final RefreshCooldown cooldown = new RefreshCooldown(new PricingClock(clock));

    @Test
    void firstCallAcquires() {
        assertThat(cooldown.tryAcquire()).isTrue();
    }

    @Test
    void callAt59SecondsIsDenied() {
        cooldown.tryAcquire();
        clock.advance(Duration.ofSeconds(59));

        assertThat(cooldown.tryAcquire()).isFalse();
        assertThat(cooldown.retryAfterSeconds()).isEqualTo(1);
    }

    @Test
    void callAt60SecondsIsAllowed() {
        cooldown.tryAcquire();
        clock.advance(Duration.ofSeconds(60));

        assertThat(cooldown.tryAcquire()).isTrue();
    }

    @Test
    void deniedCallDoesNotRestartTheWindow() {
        cooldown.tryAcquire();
        clock.advance(Duration.ofSeconds(30));
        cooldown.tryAcquire();
        clock.advance(Duration.ofSeconds(30));

        assertThat(cooldown.tryAcquire()).isTrue();
    }

    @Test
    void concurrentCallsOnlyOneAcquires() throws Exception {
        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            results.add(pool.submit(() -> {
                start.await();
                return cooldown.tryAcquire();
            }));
        }
        start.countDown();
        int acquired = 0;
        for (Future<Boolean> f : results) {
            if (f.get()) {
                acquired++;
            }
        }
        pool.shutdown();

        assertThat(acquired).isEqualTo(1);
    }
}
