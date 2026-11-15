package com.tunahan.finans.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** 1 birim {@code currency} kaç TL. */
@Entity
@Table(name = "exchange_rate")
public class ExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String currency;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    @Column(name = "rate_try", nullable = false, precision = 19, scale = 8)
    private BigDecimal rateTry;

    @Column(nullable = false)
    private String source;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    protected ExchangeRate() {
    }

    public ExchangeRate(String currency, LocalDate rateDate, BigDecimal rateTry, String source, Instant fetchedAt) {
        this.currency = currency;
        this.rateDate = rateDate;
        this.rateTry = rateTry;
        this.source = source;
        this.fetchedAt = fetchedAt;
    }

    /** Aynı gün yeniden çekilen kur eskisinin yerine geçer. */
    public void update(BigDecimal rateTry, String source, Instant fetchedAt) {
        this.rateTry = rateTry;
        this.source = source;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() {
        return id;
    }

    public String getCurrency() {
        return currency;
    }

    public LocalDate getRateDate() {
        return rateDate;
    }

    public BigDecimal getRateTry() {
        return rateTry;
    }

    public String getSource() {
        return source;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }
}
