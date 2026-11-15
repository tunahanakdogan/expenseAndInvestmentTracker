package com.tunahan.finans.expense;

import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.Money;

import java.math.BigDecimal;
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
     * Taksitlerin toplamı her zaman {@code total}'a eşittir.
     */
    static List<BigDecimal> split(BigDecimal total, int count) {
        BigDecimal part = total.divide(BigDecimal.valueOf(count), 2, Money.ROUNDING);
        BigDecimal last = total.subtract(part.multiply(BigDecimal.valueOf(count - 1L)));
        if (part.signum() <= 0 || last.signum() <= 0) {
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
