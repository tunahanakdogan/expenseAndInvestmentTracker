package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.pricing.TrackedAssetSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Fiyat modülüne hangi varlıkların fiyatının çekileceğini söyler (tüm kullanıcılar, tekil).
 * Döviz varlıkları hariç: onların değeri TCMB kurundan gelir, ayrı bir fiyat sağlayıcısı yoktur.
 */
@Component
class InvestmentTrackedAssets implements TrackedAssetSource {

    private final AssetRepository assets;

    InvestmentTrackedAssets(AssetRepository assets) {
        this.assets = assets;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrackedAsset> trackedAssets() {
        return assets.findAll().stream()
                .filter(a -> a.getType() != AssetType.CURRENCY)
                .map(a -> new TrackedAsset(a.getType(), a.getSymbol()))
                .distinct()
                .toList();
    }
}
