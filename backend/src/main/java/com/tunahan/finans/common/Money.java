package com.tunahan.finans.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/** Tutar + para birimi. Para hesapları her zaman bunun üzerinden, HALF_EVEN ile yapılır. */
public record Money(BigDecimal amount, String currency) {

    public static final RoundingMode ROUNDING = RoundingMode.HALF_EVEN;

    public Money {
        Objects.requireNonNull(amount, "amount");
        Objects.requireNonNull(currency, "currency");
        if (!currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Geçersiz para birimi: " + currency);
        }
        Currency.getInstance(currency);
    }

    public static Money of(String amount, String currency) {
        return new Money(new BigDecimal(amount), currency);
    }

    public Money add(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Farklı para birimleri toplanamaz: " + currency + ", " + other.currency);
        }
        return new Money(amount.add(other.amount), currency);
    }

    /** Gösterim/kayıt için 2 hane. */
    public Money rounded() {
        return new Money(amount.setScale(2, ROUNDING), currency);
    }
}
