package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PriceRefreshJobTest {

    private final PriceRefreshService service = mock(PriceRefreshService.class);
    private final PriceRefreshJob job = new PriceRefreshJob(service);

    private Scheduled[] scheduled(String method) throws NoSuchMethodException {
        return PriceRefreshJob.class.getDeclaredMethod(method).getAnnotationsByType(Scheduled.class);
    }

    @Test
    void jobDeclaresSpecCronsAndZone() throws Exception {
        assertThat(Arrays.stream(scheduled("refreshRates")).map(Scheduled::cron).collect(Collectors.toSet()))
                .containsExactlyInAnyOrder("0 45 15 * * MON-FRI", "0 30 16 * * MON-FRI");
        assertThat(Arrays.stream(scheduled("refreshMarketPrices")).map(Scheduled::cron))
                .containsExactly("0 0 10-23 * * MON-FRI");
        assertThat(Arrays.stream(scheduled("refreshFunds")).map(Scheduled::cron))
                .containsExactly("0 30 19 * * MON-FRI");
        for (String m : new String[]{"refreshRates", "refreshMarketPrices", "refreshFunds"}) {
            assertThat(scheduled(m)).allSatisfy(s -> assertThat(s.zone()).isEqualTo("Europe/Istanbul"));
        }
    }

    @Test
    void marketJobRefreshesBistUsAndGoldOnly() {
        job.refreshMarketPrices();

        verify(service).refreshPrices(Set.of(AssetType.BIST_STOCK, AssetType.US_STOCK, AssetType.GOLD));
    }

    @Test
    void fundJobRefreshesFundOnly() {
        job.refreshFunds();

        verify(service).refreshPrices(Set.of(AssetType.FUND));
    }

    @Test
    void rateJobRefreshesRates() {
        job.refreshRates();

        verify(service).refreshRates();
    }

    @Test
    void jobSwallowsServiceException() {
        when(service.refreshRates()).thenThrow(new RuntimeException("boom"));
        when(service.refreshPrices(any())).thenThrow(new RuntimeException("boom"));

        assertThatCode(job::refreshRates).doesNotThrowAnyException();
        assertThatCode(job::refreshMarketPrices).doesNotThrowAnyException();
        assertThatCode(job::refreshFunds).doesNotThrowAnyException();
    }
}
