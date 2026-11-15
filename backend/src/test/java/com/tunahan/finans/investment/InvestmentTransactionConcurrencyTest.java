package com.tunahan.finans.investment;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Eşzamanlı istekler ayrı transaction'larda çalışmalı; bu yüzden test transaction'ı yok
 * ve veriler elle temizlenir.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class InvestmentTransactionConcurrencyTest extends InvestmentApiTestBase {

    private static final String TX = "/api/investments/transactions";

    private final List<Long> users = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (Long user : users) {
            jdbc.sql("DELETE FROM investment_transaction WHERE user_id = ?").param(user).update();
            jdbc.sql("DELETE FROM asset WHERE user_id = ?").param(user).update();
            jdbc.sql("DELETE FROM app_user WHERE id = ?").param(user).update();
        }
    }

    @Test
    void concurrentSellsCannotOversell() throws Exception {
        long user = newUser();
        users.add(user);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            // Yarış her seferinde tutmayabilir; birkaç tur dene.
            for (int round = 0; round < 8; round++) {
                long asset = createAsset(user, "BIST_STOCK", "R" + round, "Tur " + round);
                assertThat(postTx(user, asset, "BUY", "2026-01-10", "10", "100", null, null)).hasStatus(201);

                CyclicBarrier start = new CyclicBarrier(2);
                Callable<Integer> sell = () -> {
                    start.await();
                    return postTx(user, asset, "SELL", "2026-01-11", "6", "100", null, null)
                            .getResponse().getStatus();
                };
                Future<Integer> first = pool.submit(sell);
                Future<Integer> second = pool.submit(sell);

                assertThat(List.of(first.get(), second.get())).as("tur %d", round)
                        .containsExactlyInAnyOrder(201, 422);
                assertThat(InvestmentApiTestBase.<Integer>path(get(user, TX + "?assetId=" + asset), "$.length()"))
                        .isEqualTo(2);
            }
        } finally {
            pool.shutdownNow();
        }
    }
}
