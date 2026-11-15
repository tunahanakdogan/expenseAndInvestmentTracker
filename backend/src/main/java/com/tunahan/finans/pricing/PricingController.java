package com.tunahan.finans.pricing;

import com.tunahan.finans.common.NotFoundException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/pricing")
class PricingController {

    private static final DateTimeFormatter TR_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final PriceQueryService prices;

    PricingController(PriceQueryService prices) {
        this.prices = prices;
    }

    @GetMapping("/rate")
    RateResponse rate(@RequestParam String currency,
                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return prices.rateRecord(currency, date)
                .map(r -> new RateResponse(r.getCurrency(), r.getRateDate(), r.getRateTry()))
                .orElseThrow(() -> new NotFoundException(
                        currency + " için " + TR_DATE.format(date) + " veya öncesine ait kur bulunamadı"));
    }

    record RateResponse(String currency, LocalDate date, BigDecimal rateTry) {
    }
}
