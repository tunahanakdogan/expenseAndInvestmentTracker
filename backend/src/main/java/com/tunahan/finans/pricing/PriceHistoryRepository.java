package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {

    Optional<PriceHistory> findFirstByAssetTypeAndSymbolOrderByPriceDateDesc(AssetType assetType, String symbol);

    Optional<PriceHistory> findByAssetTypeAndSymbolAndPriceDate(AssetType assetType, String symbol, LocalDate priceDate);
}
