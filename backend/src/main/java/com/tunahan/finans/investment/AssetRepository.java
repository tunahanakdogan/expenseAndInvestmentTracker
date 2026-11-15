package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

interface AssetRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByUserIdOrderByNameAsc(Long userId);

    Optional<Asset> findByIdAndUserId(Long id, Long userId);

    /** Satırı transaction sonuna kadar kilitler (SELECT … FOR UPDATE). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Asset> findWithLockByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndTypeAndSymbol(Long userId, AssetType type, String symbol);
}
