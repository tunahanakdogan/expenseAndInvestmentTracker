package com.tunahan.finans.investment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "investment_transaction")
class InvestmentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    @Column(nullable = false, precision = 19, scale = 8)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 19, scale = 8)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal commission;

    @Column(nullable = false)
    private String currency;

    /** İşlem anındaki USD/TRY kuru; yalnız ABD hissesinde dolu. */
    @Column(name = "fx_rate_try", precision = 19, scale = 8)
    private BigDecimal fxRateTry;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected InvestmentTransaction() {
    }

    InvestmentTransaction(Long userId, Long assetId, TransactionType type, LocalDate tradeDate, BigDecimal quantity,
                          BigDecimal unitPrice, BigDecimal commission, String currency, BigDecimal fxRateTry) {
        this.userId = userId;
        this.assetId = assetId;
        this.type = type;
        this.tradeDate = tradeDate;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.commission = commission;
        this.currency = currency;
        this.fxRateTry = fxRateTry;
        this.createdAt = Instant.now();
    }

    PositionCalculator.Trade toTrade() {
        return new PositionCalculator.Trade(type, quantity, unitPrice, commission, fxRateTry);
    }

    Long getId() {
        return id;
    }

    Long getAssetId() {
        return assetId;
    }

    TransactionType getType() {
        return type;
    }

    LocalDate getTradeDate() {
        return tradeDate;
    }

    BigDecimal getQuantity() {
        return quantity;
    }

    BigDecimal getUnitPrice() {
        return unitPrice;
    }

    BigDecimal getCommission() {
        return commission;
    }

    String getCurrency() {
        return currency;
    }

    BigDecimal getFxRateTry() {
        return fxRateTry;
    }
}
