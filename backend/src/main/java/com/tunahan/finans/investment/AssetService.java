package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Currency;
import java.util.List;

@Service
class AssetService {

    private final AssetRepository assets;
    private final InvestmentTransactionRepository transactions;

    AssetService(AssetRepository assets, InvestmentTransactionRepository transactions) {
        this.assets = assets;
        this.transactions = transactions;
    }

    @Transactional(readOnly = true)
    List<Asset> list(Long userId) {
        return assets.findByUserIdOrderByNameAsc(userId);
    }

    @Transactional(readOnly = true)
    Asset get(Long userId, Long id) {
        return assets.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("Varlık bulunamadı"));
    }

    @Transactional
    Asset create(Long userId, AssetType type, String rawSymbol, String name) {
        String symbol = Asset.normalizeSymbol(rawSymbol);
        validateSymbol(type, symbol);
        if (assets.existsByUserIdAndTypeAndSymbol(userId, type, symbol)) {
            throw new BusinessRuleException("Bu varlık zaten kayıtlı");
        }
        return assets.save(new Asset(userId, type, symbol, name.strip()));
    }

    @Transactional
    Asset rename(Long userId, Long id, String name) {
        Asset asset = get(userId, id);
        asset.rename(name.strip());
        return asset;
    }

    @Transactional
    void delete(Long userId, Long id) {
        Asset asset = get(userId, id);
        if (transactions.existsByAssetId(asset.getId())) {
            throw new BusinessRuleException("İşlemi olan varlık silinemez");
        }
        assets.delete(asset);
    }

    /** Sembol, fiyat tablosunun anahtarıdır; fiyat sağlayıcının tanıyacağı biçimde olmalı. */
    private static void validateSymbol(AssetType type, String symbol) {
        if (!symbol.matches("[A-Z0-9.]{1,30}")) {
            throw new BusinessRuleException("Sembol yalnız harf, rakam ve nokta içerebilir");
        }
        if (type == AssetType.BIST_STOCK && symbol.endsWith(".IS")) {
            throw new BusinessRuleException("BIST sembolüne .IS ekleme (ör. THYAO)");
        }
        if (type == AssetType.GOLD && !symbol.equals("GRAM")) {
            throw new BusinessRuleException("Altın için sembol GRAM olmalı");
        }
        if (type == AssetType.CURRENCY && (symbol.equals("TRY") || !isCurrencyCode(symbol))) {
            throw new BusinessRuleException(
                    "Döviz sembolü TRY dışında geçerli bir para birimi kodu olmalı (ör. USD)");
        }
    }

    private static boolean isCurrencyCode(String symbol) {
        try {
            Currency.getInstance(symbol);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
