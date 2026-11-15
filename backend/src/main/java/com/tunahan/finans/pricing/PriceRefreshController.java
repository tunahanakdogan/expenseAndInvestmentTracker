package com.tunahan.finans.pricing;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pricing")
class PriceRefreshController {

    private final PriceRefreshService service;
    private final RefreshCooldown cooldown;

    PriceRefreshController(PriceRefreshService service, RefreshCooldown cooldown) {
        this.service = service;
        this.cooldown = cooldown;
    }

    @PostMapping("/refresh")
    ResponseEntity<?> refresh() {
        if (!cooldown.tryAcquire()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(cooldown.retryAfterSeconds()))
                    .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, "Biraz bekleyip tekrar dene"));
        }
        PriceRefreshService.RefreshResult r = service.refreshAll();
        return ResponseEntity.ok(new RefreshResponse(r.updatedPrices(), r.updatedRates(), r.failed()));
    }

    record RefreshResponse(int updatedPrices, int updatedRates, List<String> failed) {
    }
}
