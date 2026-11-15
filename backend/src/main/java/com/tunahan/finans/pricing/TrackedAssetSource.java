package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;

import java.util.List;

/**
 * Fiyatı çekilecek varlıklar. Yatırım modülü uygular; böylece pricing yatırıma bağımlı olmaz
 * ve investment → pricing yönünde tek bir bağımlılık kalır.
 */
public interface TrackedAssetSource {

    List<TrackedAsset> trackedAssets();

    record TrackedAsset(AssetType type, String symbol) {
    }
}
