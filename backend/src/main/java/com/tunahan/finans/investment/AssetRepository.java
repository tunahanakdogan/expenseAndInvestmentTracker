package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface AssetRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByUserIdOrderByNameAsc(Long userId);

    Optional<Asset> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndTypeAndSymbol(Long userId, AssetType type, String symbol);
}
