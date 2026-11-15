package com.tunahan.finans.pricing;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.TestAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@IntegrationTest
class PriceRefreshControllerTest {

    @Autowired
    MockMvcTester mvc;
    @MockitoBean
    PriceRefreshService service;
    @MockitoBean
    RefreshCooldown cooldown;

    @Test
    void refreshReturnsCountsAndFailed() {
        when(cooldown.tryAcquire()).thenReturn(true);
        when(service.refreshAll()).thenReturn(new PriceRefreshService.RefreshResult(3, 2, List.of("BIST_STOCK:ASELS")));

        var response = assertThat(mvc.post().uri("/api/pricing/refresh").header("Authorization", TestAuth.bearer(mvc)));

        response.hasStatusOk().bodyJson()
                .isLenientlyEqualTo("""
                        {"updatedPrices": 3, "updatedRates": 2, "failed": ["BIST_STOCK:ASELS"]}
                        """);
    }

    @Test
    void refreshWithinCooldownReturns429ProblemDetail() {
        when(cooldown.tryAcquire()).thenReturn(false);
        when(cooldown.retryAfterSeconds()).thenReturn(42L);

        assertThat(mvc.post().uri("/api/pricing/refresh").header("Authorization", TestAuth.bearer(mvc)))
                .hasStatus(HttpStatus.TOO_MANY_REQUESTS)
                .hasHeader(HttpHeaders.RETRY_AFTER, "42")
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson().isLenientlyEqualTo("""
                        {"status": 429, "detail": "Biraz bekleyip tekrar dene"}
                        """);
        verifyNoInteractions(service);
    }

    @Test
    void refreshWithoutTokenReturns401() {
        assertThat(mvc.post().uri("/api/pricing/refresh")).hasStatus(HttpStatus.UNAUTHORIZED);
    }
}
