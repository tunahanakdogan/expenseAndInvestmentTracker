package com.tunahan.finans.expense;

import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.Money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/** Dönem kuralı (D-001) ve taksit bölme; bkz. docs/domain.md "Harcamalar ve taksitler". */
final class PaymentPlan {

    private PaymentPlan() {
    }

    /**
     * İlk ödemenin dönemi. Nakit/banka ({@code statementDay == null}): harcama ayı.
     * Kredi kartı: harcama günü, o ayın etkin kesim gününden (kesim günü, ay kısaysa ayın son günü)
     * sonraysa bir sonraki ekstreye girer.
     */
    static YearMonth firstPeriod(LocalDate expenseDate, Integer statementDay) {
        YearMonth month = YearMonth.from(expenseDate);
        if (statementDay == null) {
            return month;
        }
        int effectiveStatementDay = Math.min(statementDay, month.lengthOfMonth());
        return expenseDate.getDayOfMonth() <= effectiveStatementDay ? month : month.plusMonths(1);
    }

    /** Taksit i (1'den başlar) → ilk dönem + (i − 1) ay. */
    static List<YearMonth> periods(LocalDate expenseDate, Integer statementDay, int count) {
        YearMonth first = firstPeriod(expenseDate, statementDay);
        List<YearMonth> periods = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            periods.add(first.plusMonths(i));
        }
        return periods;
    }

    /**
     * Toplamı {@code count} taksite böler: taksit = toplam / N (2 hane, HALF_EVEN), kuruş farkı son taksitte.
     * Yukarı yuvarlama son taksiti sıfıra ya da eksiye düşürüyorsa (küçük tutar, çok taksit) taksit aşağı
     * yuvarlanır; o zaman son taksit en az diğerleri kadardır. Taksitlerin toplamı her zaman {@code total}'a
     * eşittir. Taksit başına 1 kuruş bile düşmüyorsa (toplam < 0.01 × N) reddedilir.
     */
    static List<BigDecimal> split(BigDecimal total, int count) {
        BigDecimal divisor = BigDecimal.valueOf(count);
        BigDecimal others = BigDecimal.valueOf(count - 1L);
        BigDecimal part = total.divide(divisor, 2, Money.ROUNDING);
        BigDecimal last = total.subtract(part.multiply(others));
        if (last.signum() <= 0) {
            part = total.divide(divisor, 2, RoundingMode.DOWN);
            last = total.subtract(part.multiply(others));
        }
        if (part.signum() <= 0) {
            throw new BusinessRuleException("Tutar bu taksit sayısına bölünemeyecek kadar küçük");
        }
        List<BigDecimal> parts = new ArrayList<>(count);
        for (int i = 1; i < count; i++) {
            parts.add(part);
        }
        parts.add(last);
        return parts;
    }
}
