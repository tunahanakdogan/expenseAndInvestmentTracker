package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.NotFoundException;
import com.tunahan.finans.investment.PositionCalculator.Trade;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
class InvestmentTransactionService {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    private final InvestmentTransactionRepository transactions;
    private final AssetService assets;

    InvestmentTransactionService(InvestmentTransactionRepository transactions, AssetService assets) {
        this.transactions = transactions;
        this.assets = assets;
    }

    record NewTransaction(Long assetId, TransactionType type, LocalDate tradeDate, BigDecimal quantity,
                          BigDecimal unitPrice, BigDecimal commission, BigDecimal fxRateTry) {
    }

    /** En yeni işlem üstte; {@code assetId} null ise kullanıcının tüm işlemleri. */
    @Transactional(readOnly = true)
    List<InvestmentTransaction> list(Long userId, Long assetId) {
        if (assetId == null) {
            return transactions.findByUserIdOrderByTradeDateDescIdDesc(userId);
        }
        assets.get(userId, assetId);
        return transactions.findByUserIdAndAssetIdOrderByTradeDateDescIdDesc(userId, assetId);
    }

    @Transactional
    InvestmentTransaction add(Long userId, NewTransaction tx) {
        Asset asset = assets.get(userId, tx.assetId());
        if (tx.tradeDate().isAfter(LocalDate.now(ISTANBUL))) {
            throw new BusinessRuleException("İşlem tarihi gelecekte olamaz");
        }
        boolean usStock = asset.getType() == AssetType.US_STOCK;
        if (usStock && tx.fxRateTry() == null) {
            throw new BusinessRuleException("ABD hissesi işleminde USD/TRY kuru zorunlu");
        }
        InvestmentTransaction created = new InvestmentTransaction(userId, asset.getId(), tx.type(), tx.tradeDate(),
                tx.quantity(), tx.unitPrice(), tx.commission() == null ? BigDecimal.ZERO : tx.commission(),
                asset.getCurrency(), usStock ? tx.fxRateTry() : null);

        // Geriye tarihli işlem sonrakileri de etkiler: zincirin tamamı yeniden doğrulanır.
        // Yeni kayıt en büyük id'yi alacağı için aynı gündeki işlemlerin ardına girer.
        List<InvestmentTransaction> existing =
                transactions.findByUserIdAndAssetIdOrderByTradeDateAscIdAsc(userId, asset.getId());
        List<Trade> chain = new ArrayList<>(existing.size() + 1);
        int i = 0;
        while (i < existing.size() && !existing.get(i).getTradeDate().isAfter(tx.tradeDate())) {
            chain.add(existing.get(i++).toTrade());
        }
        chain.add(created.toTrade());
        while (i < existing.size()) {
            chain.add(existing.get(i++).toTrade());
        }
        PositionCalculator.calculate(chain, usStock);

        return transactions.save(created);
    }

    @Transactional
    void delete(Long userId, Long id) {
        InvestmentTransaction tx = transactions.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("İşlem bulunamadı"));
        List<Trade> remaining = transactions.findByUserIdAndAssetIdOrderByTradeDateAscIdAsc(userId, tx.getAssetId())
                .stream().filter(t -> !t.getId().equals(id)).map(InvestmentTransaction::toTrade).toList();
        try {
            PositionCalculator.calculate(remaining, tx.getFxRateTry() != null);
        } catch (BusinessRuleException e) {
            throw new BusinessRuleException("Bu işlem silinirse eldeki adet eksiye düşer");
        }
        transactions.delete(tx);
    }

    /** Varlığın işlemleri hesap sırasında (işlem tarihi, sonra id). */
    @Transactional(readOnly = true)
    List<Trade> tradesOf(Long userId, Long assetId) {
        return transactions.findByUserIdAndAssetIdOrderByTradeDateAscIdAsc(userId, assetId)
                .stream().map(InvestmentTransaction::toTrade).toList();
    }
}
