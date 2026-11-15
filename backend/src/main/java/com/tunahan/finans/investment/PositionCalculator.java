package com.tunahan.finans.investment;

import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.Money;

import java.math.BigDecimal;
import java.util.List;

/**
 * Portföy saklanmaz; eldeki adet ve ağırlıklı ortalama maliyet işlemlerden hesaplanır (docs/domain.md).
 * Ortalama yalnız alışta değişir; satış adedi azaltır ve kâr/zararı gerçekleştirir.
 */
final class PositionCalculator {

    /** Ara hesap ölçeği; API'ye yazarken 4 haneye yuvarlanır. */
    static final int SCALE = 8;

    private PositionCalculator() {
    }

    /** {@code fxRateTry} yalnız {@code trackTry} iken okunur (ABD hissesi). */
    record Trade(TransactionType type, BigDecimal quantity, BigDecimal unitPrice, BigDecimal commission,
                 BigDecimal fxRateTry) {
    }

    /** {@code trackTry == false} ise son üç alan null. */
    record Position(BigDecimal quantity, BigDecimal costBasis, BigDecimal averageCost, BigDecimal realizedGain,
                    BigDecimal costBasisTry, BigDecimal averageCostTry, BigDecimal realizedGainTry) {
    }

    /** {@code trades} işlem tarihi, sonra id sırasında gelmelidir. */
    static Position calculate(List<Trade> trades, boolean trackTry) {
        BigDecimal qty = scaled(BigDecimal.ZERO);
        BigDecimal cost = qty, avg = qty, realized = qty;
        BigDecimal costTry = qty, avgTry = qty, realizedTry = qty;

        for (Trade t : trades) {
            BigDecimal q = t.quantity();
            BigDecimal gross = q.multiply(t.unitPrice());
            if (t.type() == TransactionType.BUY) {
                BigDecimal total = gross.add(t.commission());
                qty = scaled(qty.add(q));
                cost = scaled(cost.add(total));
                avg = divide(cost, qty);
                if (trackTry) {
                    costTry = scaled(costTry.add(total.multiply(t.fxRateTry())));
                    avgTry = divide(costTry, qty);
                }
            } else {
                if (q.compareTo(qty) > 0) {
                    throw new BusinessRuleException("Eldeki adetten fazla satılamaz");
                }
                BigDecimal net = gross.subtract(t.commission());
                realized = scaled(realized.add(net).subtract(avg.multiply(q)));
                if (trackTry) {
                    realizedTry = scaled(realizedTry.add(net.multiply(t.fxRateTry())).subtract(avgTry.multiply(q)));
                }
                qty = scaled(qty.subtract(q));
                if (qty.signum() == 0) {
                    cost = costTry = avg = avgTry = scaled(BigDecimal.ZERO);
                } else {
                    cost = scaled(avg.multiply(qty));
                    costTry = scaled(avgTry.multiply(qty));
                }
            }
        }
        return trackTry
                ? new Position(qty, cost, avg, realized, costTry, avgTry, realizedTry)
                : new Position(qty, cost, avg, realized, null, null, null);
    }

    private static BigDecimal scaled(BigDecimal value) {
        return value.setScale(SCALE, Money.ROUNDING);
    }

    private static BigDecimal divide(BigDecimal a, BigDecimal b) {
        return a.divide(b, SCALE, Money.ROUNDING);
    }
}
