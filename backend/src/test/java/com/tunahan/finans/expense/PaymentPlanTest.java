package com.tunahan.finans.expense;

import com.tunahan.finans.common.BusinessRuleException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Random;

import static com.tunahan.finans.expense.PaymentPlan.firstPeriod;
import static com.tunahan.finans.expense.PaymentPlan.periods;
import static com.tunahan.finans.expense.PaymentPlan.split;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentPlanTest {

    @Test
    void cardExpenseOnOrBeforeStatementDayBelongsToExpenseMonth() {
        assertThat(firstPeriod(LocalDate.of(2026, 11, 10), 15)).isEqualTo(YearMonth.of(2026, 11));
        assertThat(firstPeriod(LocalDate.of(2026, 11, 15), 15)).isEqualTo(YearMonth.of(2026, 11));
    }

    @Test
    void cardExpenseAfterStatementDayBelongsToNextMonth() {
        assertThat(firstPeriod(LocalDate.of(2026, 11, 16), 15)).isEqualTo(YearMonth.of(2026, 12));
    }

    @Test
    void statementDayIsCappedAtLastDayOfShortMonths() {
        assertThat(firstPeriod(LocalDate.of(2027, 2, 28), 31)).isEqualTo(YearMonth.of(2027, 2));
        assertThat(firstPeriod(LocalDate.of(2026, 11, 30), 31)).isEqualTo(YearMonth.of(2026, 11));
        assertThat(firstPeriod(LocalDate.of(2028, 2, 29), 28)).isEqualTo(YearMonth.of(2028, 3));
    }

    @Test
    void periodsRollOverYearEnd() {
        assertThat(firstPeriod(LocalDate.of(2026, 12, 20), 15)).isEqualTo(YearMonth.of(2027, 1));
        assertThat(periods(LocalDate.of(2026, 11, 10), 15, 3))
                .containsExactly(YearMonth.of(2026, 11), YearMonth.of(2026, 12), YearMonth.of(2027, 1));
    }

    /** docs/domain.md örneği: kesim günü 10, 15 Kasım'da 3 taksit → Aralık, Ocak, Şubat. */
    @Test
    void domainExample() {
        assertThat(periods(LocalDate.of(2026, 11, 15), 10, 3))
                .containsExactly(YearMonth.of(2026, 12), YearMonth.of(2027, 1), YearMonth.of(2027, 2));
    }

    @Test
    void cashAndBankExpensesBelongToExpenseMonth() {
        assertThat(firstPeriod(LocalDate.of(2026, 11, 30), null)).isEqualTo(YearMonth.of(2026, 11));
        assertThat(periods(LocalDate.of(2026, 11, 30), null, 1)).containsExactly(YearMonth.of(2026, 11));
    }

    @Test
    void splitPutsRoundingDifferenceOnLastInstallment() {
        assertThat(split(new BigDecimal("100"), 3))
                .containsExactly(new BigDecimal("33.33"), new BigDecimal("33.33"), new BigDecimal("33.34"));
        assertThat(split(new BigDecimal("0.05"), 2))
                .containsExactly(new BigDecimal("0.02"), new BigDecimal("0.03"));
        assertThat(split(new BigDecimal("250.50"), 1)).containsExactly(new BigDecimal("250.50"));
    }

    @Test
    void splitRejectsAmountsTooSmallForInstallmentCount() {
        // 0.26 / 36 = 0.01 → son taksit 0.26 − 0.35 < 0
        assertThatThrownBy(() -> split(new BigDecimal("0.26"), 36))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Tutar bu taksit sayısına bölünemeyecek kadar küçük");
        // 0.01 / 2 = 0.00 (HALF_EVEN) → ilk taksit 0
        assertThatThrownBy(() -> split(new BigDecimal("0.01"), 2)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void splitAlwaysSumsToTotal() {
        Random random = new Random(20261115);
        for (int round = 0; round < 10_000; round++) {
            BigDecimal total = BigDecimal.valueOf(1 + random.nextLong(100_000_000L), 2);
            int count = 1 + random.nextInt(36);

            List<BigDecimal> parts;
            try {
                parts = split(total, count);
            } catch (BusinessRuleException e) {
                assertThat(total).as("%s / %s reddedilmemeliydi", total, count).isLessThan(BigDecimal.ONE);
                continue;
            }

            assertThat(parts).as("%s / %s", total, count).hasSize(count);
            assertThat(parts.stream().reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo(total);
            BigDecimal part = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_EVEN);
            for (int i = 0; i < count; i++) {
                assertThat(parts.get(i)).isPositive();
                assertThat(parts.get(i).scale()).isLessThanOrEqualTo(2);
                if (i < count - 1) {
                    assertThat(parts.get(i)).isEqualByComparingTo(part);
                }
            }
        }
    }
}
