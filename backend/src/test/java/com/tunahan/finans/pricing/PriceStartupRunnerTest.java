package com.tunahan.finans.pricing;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PriceStartupRunnerTest {

    private final PriceRefreshService service = mock(PriceRefreshService.class);
    private final PriceWriter writer = mock(PriceWriter.class);
    private final PriceStartupRunner runner = new PriceStartupRunner(service, writer);

    @Test
    void startupRunnerRefreshesRatesWhenTodayMissing() {
        when(writer.hasRatesForToday()).thenReturn(false);

        runner.run(new DefaultApplicationArguments());

        verify(service, timeout(2000)).refreshRates();
    }

    @Test
    void startupRunnerSkipsWhenTodayPresent() throws Exception {
        when(writer.hasRatesForToday()).thenReturn(true);

        runner.run(new DefaultApplicationArguments());

        Thread.sleep(200);
        verify(service, never()).refreshRates();
    }

    @Test
    void startupRunnerDoesNotBlockRun() {
        when(writer.hasRatesForToday()).thenReturn(false);
        when(service.refreshRates()).thenAnswer(i -> {
            Thread.sleep(2000);
            return null;
        });

        long start = System.nanoTime();
        runner.run(new DefaultApplicationArguments());
        long millis = (System.nanoTime() - start) / 1_000_000;

        assertThat(millis).isLessThan(500);
    }
}
