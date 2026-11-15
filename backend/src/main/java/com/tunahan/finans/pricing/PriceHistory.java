package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
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
@Table(name = "price_history")
public class PriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false)
    private AssetType assetType;

    @Column(nullable = false)
    private String symbol;

    @Column(name = "price_date", nullable = false)
    private LocalDate priceDate;

    @Column(nullable = false, precision = 19, scale = 8)
    private BigDecimal price;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String source;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    protected PriceHistory() {
    }

    public PriceHistory(AssetType assetType, String symbol, LocalDate priceDate, BigDecimal price,
                        String currency, String source, Instant fetchedAt) {
        this.assetType = assetType;
        this.symbol = symbol;
        this.priceDate = priceDate;
        this.price = price;
        this.currency = currency;
        this.source = source;
        this.fetchedAt = fetchedAt;
    }

    /** Aynı gün yeniden çekilen fiyat eskisinin yerine geçer. */
    public void update(BigDecimal price, String source, Instant fetchedAt) {
        this.price = price;
        this.source = source;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() {
        return id;
    }

    public AssetType getAssetType() {
        return assetType;
    }

    public String getSymbol() {
        return symbol;
    }

    public LocalDate getPriceDate() {
        return priceDate;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getCurrency() {
        return currency;
    }

    public String getSource() {
        return source;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }
}
