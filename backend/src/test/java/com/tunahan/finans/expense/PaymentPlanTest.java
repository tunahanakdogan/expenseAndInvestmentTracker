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

    /** HALF_EVEN yukarı yuvarlayınca son taksit eksiye düşüyorsa taksit aşağı yuvarlanır; fark yine son taksitte. */
    @Test
    void splitRoundsDownWhenHalfEvenWouldMakeLastInstallmentNonPositive() {
        // 1.00 / 36 = 0.0278 → HALF_EVEN 0.03 → son taksit 1.00 − 1.05 < 0; DOWN 0.02 → son 0.30
        List<BigDecimal> parts = split(new BigDecimal("1.00"), 36);

        assertThat(parts).hasSize(36);
        assertThat(parts.subList(0, 35)).containsOnly(new BigDecimal("0.02"));
        assertThat(parts.get(35)).isEqualTo(new BigDecimal("0.30"));
        assertThat(split(new BigDecimal("0.36"), 36)).containsOnly(new BigDecimal("0.01"));
    }

    @Test
    void splitRejectsAmountsBelowOneKurusPerInstallment() {
        assertThatThrownBy(() -> split(new BigDecimal("0.35"), 36))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Tutar bu taksit sayısına bölünemeyecek kadar küçük");
        assertThatThrownBy(() -> split(new BigDecimal("0.26"), 36)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> split(new BigDecimal("0.01"), 2)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void splitAlwaysSumsToTotal() {
        Random random = new Random(20261115);
        for (int round = 0; round < 10_000; round++) {
            // Yarısı küçük tutarlar: ret sınırı (toplam < 0.01 × N) ve aşağı yuvarlama dalı da sınansın.
            long kurus = 1 + (round % 2 == 0 ? random.nextLong(100_000_000L) : random.nextLong(1_000L));
            BigDecimal total = BigDecimal.valueOf(kurus, 2);
            int count = 1 + random.nextInt(36);
            boolean tooSmall = kurus < count;

            List<BigDecimal> parts;
            try {
                parts = split(total, count);
            } catch (BusinessRuleException e) {
                assertThat(tooSmall).as("%s / %s reddedilmemeliydi", total, count).isTrue();
                continue;
            }

            assertThat(tooSmall).as("%s / %s reddedilmeliydi", total, count).isFalse();
            assertThat(parts).as("%s / %s", total, count).hasSize(count);
            assertThat(parts.stream().reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo(total);
            for (int i = 0; i < count; i++) {
                assertThat(parts.get(i)).as("%s / %s, taksit %s", total, count, i + 1).isPositive();
                assertThat(parts.get(i).scale()).isLessThanOrEqualTo(2);
                if (i < count - 1) {
                    assertThat(parts.get(i)).isEqualByComparingTo(parts.get(0));
                }
            }
            // Yuvarlama gerekmiyorsa ya da HALF_EVEN geçerliyse ilk taksitler HALF_EVEN bölümdür.
            BigDecimal halfEven = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_EVEN);
            if (total.subtract(halfEven.multiply(BigDecimal.valueOf(count - 1L))).signum() > 0) {
                assertThat(parts.get(0)).isEqualByComparingTo(halfEven);
            }
        }
    }
}
