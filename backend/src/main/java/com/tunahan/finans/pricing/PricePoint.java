package com.tunahan.finans.pricing;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PricePoint(BigDecimal price, String currency, LocalDate date) {
}
