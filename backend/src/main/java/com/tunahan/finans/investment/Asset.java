package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "asset")
class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetType type;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String currency;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Asset() {
    }

    Asset(Long userId, AssetType type, String symbol, String name) {
        this.userId = userId;
        this.type = type;
        this.symbol = symbol;
        this.name = name;
        this.currency = currencyFor(type);
        this.createdAt = Instant.now();
    }

    /** Locale.ROOT: JVM tr-TR iken "isctr" → "İSCTR" olmasın. */
    static String normalizeSymbol(String raw) {
        return raw.strip().toUpperCase(Locale.ROOT);
    }

    /** İşlem para birimi: ABD hissesi USD; döviz dahil diğer her tür TRY (D-008). */
    static String currencyFor(AssetType type) {
        return type == AssetType.US_STOCK ? "USD" : "TRY";
    }

    void rename(String name) {
        this.name = name;
    }

    Long getId() {
        return id;
    }

    Long getUserId() {
        return userId;
    }

    AssetType getType() {
        return type;
    }

    String getSymbol() {
        return symbol;
    }

    String getName() {
        return name;
    }

    String getCurrency() {
        return currency;
    }
}
