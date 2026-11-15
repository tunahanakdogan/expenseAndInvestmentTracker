package com.tunahan.finans.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "account")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType type;

    @Column(nullable = false)
    private String currency;

    /** Yalnız kredi kartında dolu (1–31). */
    @Column(name = "statement_day")
    private Integer statementDay;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Account() {
    }

    Account(Long userId, String name, AccountType type, String currency, Integer statementDay) {
        this.userId = userId;
        this.createdAt = Instant.now();
        update(name, type, currency, statementDay);
    }

    void update(String name, AccountType type, String currency, Integer statementDay) {
        this.name = name;
        this.type = type;
        this.currency = currency;
        this.statementDay = statementDay;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public AccountType getType() {
        return type;
    }

    public String getCurrency() {
        return currency;
    }

    public Integer getStatementDay() {
        return statementDay;
    }
}
