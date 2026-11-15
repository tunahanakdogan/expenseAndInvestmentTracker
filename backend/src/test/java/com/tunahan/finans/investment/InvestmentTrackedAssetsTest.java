package com.tunahan.finans.investment;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.TestAuth;
import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.pricing.TrackedAssetSource;
import com.tunahan.finans.pricing.TrackedAssetSource.TrackedAsset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@Transactional
class InvestmentTrackedAssetsTest {

    @Autowired
    TrackedAssetSource source;
    @Autowired
    AssetRepository assets;
    @Autowired
    JdbcClient jdbc;

    @Test
    void pricingSeesEveryPricedAssetOnce() {
        Long user = jdbc.sql("select id from app_user where username = ?").param(TestAuth.USERNAME)
                .query(Long.class).single();
        Long other = jdbc.sql("insert into app_user (username, password_hash, created_at) values ('diger', 'x', systimestamp)")
                .update() == 1
                ? jdbc.sql("select id from app_user where username = 'diger'").query(Long.class).single()
                : null;

        assets.save(new Asset(user, AssetType.BIST_STOCK, "THYAO", "Türk Hava Yolları"));
        assets.save(new Asset(other, AssetType.BIST_STOCK, "THYAO", "THY"));
        assets.save(new Asset(user, AssetType.US_STOCK, "AAPL", "Apple"));
        assets.save(new Asset(user, AssetType.GOLD, "GRAM", "Gram altın"));
        assets.save(new Asset(user, AssetType.CURRENCY, "USD", "Dolar"));

        assertThat(source.trackedAssets()).containsExactlyInAnyOrder(
                new TrackedAsset(AssetType.BIST_STOCK, "THYAO"),
                new TrackedAsset(AssetType.US_STOCK, "AAPL"),
                new TrackedAsset(AssetType.GOLD, "GRAM"));
    }
}
