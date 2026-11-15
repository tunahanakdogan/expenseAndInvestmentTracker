package com.tunahan.finans.investment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface InvestmentTransactionRepository extends JpaRepository<InvestmentTransaction, Long> {

    /** Hesap sırası: işlem tarihi, aynı günde giriş sırası. */
    List<InvestmentTransaction> findByUserIdAndAssetIdOrderByTradeDateAscIdAsc(Long userId, Long assetId);

    List<InvestmentTransaction> findByUserIdAndAssetIdOrderByTradeDateDescIdDesc(Long userId, Long assetId);

    List<InvestmentTransaction> findByUserIdOrderByTradeDateDescIdDesc(Long userId);

    Optional<InvestmentTransaction> findByIdAndUserId(Long id, Long userId);

    boolean existsByAssetId(Long assetId);
}
