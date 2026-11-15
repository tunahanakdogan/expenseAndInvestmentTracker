package com.tunahan.finans.investment;

import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.investment.PositionCalculator.Position;
import com.tunahan.finans.investment.PositionCalculator.Trade;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static com.tunahan.finans.investment.PositionCalculator.calculate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PositionCalculatorTest {

    @Test
    void weightedAverageIncludesCommission() {
        Position p = calculate(List.of(buy("10", "100", "5"), buy("10", "120", "7")), false);

        assertThat(p.quantity()).isEqualByComparingTo("20");
        assertThat(p.costBasis()).isEqualByComparingTo("2212");
        assertThat(p.averageCost()).isEqualByComparingTo("110.6");
        assertThat(p.realizedGain()).isEqualByComparingTo("0");
        assertThat(p.costBasisTry()).isNull();
        assertThat(p.averageCostTry()).isNull();
        assertThat(p.realizedGainTry()).isNull();
    }

    @Test
    void sellKeepsAverageAndRealizesGain() {
        Position p = calculate(List.of(buy("10", "100", "5"), buy("10", "120", "7"), sell("5", "150", "3")), false);

        assertThat(p.quantity()).isEqualByComparingTo("15");
        assertThat(p.averageCost()).isEqualByComparingTo("110.6");
        assertThat(p.costBasis()).isEqualByComparingTo("1659");
        assertThat(p.realizedGain()).isEqualByComparingTo("194");
    }

    @Test
    void sellKeepsRoundedAverageExactly() {
        Position p = calculate(List.of(buy("3", "10", "1"), sell("1", "12", "0")), false);

        assertThat(p.averageCost()).isEqualByComparingTo("10.33333333");
        assertThat(p.quantity()).isEqualByComparingTo("2");
        assertThat(p.costBasis()).isEqualByComparingTo("20.66666666");
        assertThat(p.realizedGain()).isEqualByComparingTo("1.66666667");
    }

    @Test
    void sellingMoreThanHeldIsRejected() {
        assertThatThrownBy(() -> calculate(List.of(buy("10", "100", "0"), sell("10.00000001", "100", "0")), false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Eldeki adetten fazla satılamaz");
    }

    @Test
    void sellBeforeLaterSellCanBreakChain() {
        // Geriye tarihli satış araya girince sonraki satış karşılıksız kalır.
        assertThatThrownBy(() -> calculate(
                List.of(buy("10", "100", "0"), sell("5", "100", "0"), sell("10", "100", "0")), false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Eldeki adetten fazla satılamaz");
    }

    @Test
    void fractionalQuantityUsesEightDecimalsHalfEven() {
        Position p = calculate(List.of(buy("0.12345678", "150.25", "1")), false);

        assertThat(p.quantity()).isEqualByComparingTo("0.12345678");
        assertThat(p.costBasis()).isEqualByComparingTo("19.54938120"); // 19.549381195 → HALF_EVEN
        assertThat(p.averageCost()).isEqualByComparingTo("158.35000070");
    }

    @Test
    void usStockTracksCostInUsdAndTry() {
        Position p = calculate(List.of(
                buyFx("2", "200", "1", "30"), buyFx("2", "250", "1", "34"), sellFx("1", "300", "2", "40")), true);

        assertThat(p.quantity()).isEqualByComparingTo("3");
        assertThat(p.costBasis()).isEqualByComparingTo("676.5");
        assertThat(p.averageCost()).isEqualByComparingTo("225.5");
        assertThat(p.realizedGain()).isEqualByComparingTo("72.5");
        assertThat(p.costBasisTry()).isEqualByComparingTo("21798");
        assertThat(p.averageCostTry()).isEqualByComparingTo("7266");
        assertThat(p.realizedGainTry()).isEqualByComparingTo("4654");
    }

    @Test
    void fullySoldPositionResetsAverageAndKeepsRealizedGain() {
        Position sold = calculate(List.of(buy("10", "100", "5"), sell("10", "110", "0")), false);

        assertThat(sold.quantity()).isEqualByComparingTo("0");
        assertThat(sold.costBasis()).isEqualByComparingTo("0");
        assertThat(sold.averageCost()).isEqualByComparingTo("0");
        assertThat(sold.realizedGain()).isEqualByComparingTo("95");

        Position rebought = calculate(
                List.of(buy("10", "100", "5"), sell("10", "110", "0"), buy("2", "50", "0")), false);

        assertThat(rebought.quantity()).isEqualByComparingTo("2");
        assertThat(rebought.costBasis()).isEqualByComparingTo("100");
        assertThat(rebought.averageCost()).isEqualByComparingTo("50");
        assertThat(rebought.realizedGain()).isEqualByComparingTo("95");
    }

    @Test
    void noTradesGivesZeroPosition() {
        Position p = calculate(List.of(), true);

        assertThat(p.quantity()).isEqualByComparingTo("0");
        assertThat(p.costBasis()).isEqualByComparingTo("0");
        assertThat(p.averageCost()).isEqualByComparingTo("0");
        assertThat(p.realizedGain()).isEqualByComparingTo("0");
        assertThat(p.costBasisTry()).isEqualByComparingTo("0");
        assertThat(p.averageCostTry()).isEqualByComparingTo("0");
        assertThat(p.realizedGainTry()).isEqualByComparingTo("0");
    }

    private static Trade buy(String q, String p, String c) {
        return buyFx(q, p, c, null);
    }

    private static Trade sell(String q, String p, String c) {
        return sellFx(q, p, c, null);
    }

    private static Trade buyFx(String q, String p, String c, String fx) {
        return trade(TransactionType.BUY, q, p, c, fx);
    }

    private static Trade sellFx(String q, String p, String c, String fx) {
        return trade(TransactionType.SELL, q, p, c, fx);
    }

    private static Trade trade(TransactionType type, String q, String p, String c, String fx) {
        return new Trade(type, new BigDecimal(q), new BigDecimal(p), new BigDecimal(c),
                fx == null ? null : new BigDecimal(fx));
    }
}
