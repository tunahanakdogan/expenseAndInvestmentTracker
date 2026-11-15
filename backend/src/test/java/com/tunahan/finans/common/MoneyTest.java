package com.tunahan.finans.common;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    @Test
    void rejectsNullAmountAndCurrency() {
        assertThatThrownBy(() -> new Money(null, "TRY")).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new Money(BigDecimal.ONE, null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void rejectsNonIsoCurrency() {
        assertThatThrownBy(() -> Money.of("1", "XYZ1")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Money.of("1", "try")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void roundsToTwoDigitsHalfEven() {
        assertThat(Money.of("10.005", "TRY").rounded().amount()).isEqualByComparingTo("10.00");
        assertThat(Money.of("10.015", "TRY").rounded().amount()).isEqualByComparingTo("10.02");
        assertThat(Money.of("10.015", "TRY").rounded().amount().scale()).isEqualTo(2);
    }

    @Test
    void addsSameCurrency() {
        assertThat(Money.of("10.10", "USD").add(Money.of("0.05", "USD"))).isEqualTo(Money.of("10.15", "USD"));
    }

    @Test
    void refusesToAddDifferentCurrencies() {
        assertThatThrownBy(() -> Money.of("1", "TRY").add(Money.of("1", "USD")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
