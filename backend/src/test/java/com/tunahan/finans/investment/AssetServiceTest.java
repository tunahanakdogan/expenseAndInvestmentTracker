package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.common.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssetServiceTest {

    /** Eşzamanlı iki istek existsBy kontrolünü birlikte geçerse unique kısıtı devreye girer; 500 değil 422 dönmeli. */
    @Test
    void concurrentDuplicateCaughtByUniqueConstraintIsBusinessRuleError() {
        AssetRepository assets = mock(AssetRepository.class);
        when(assets.existsByUserIdAndTypeAndSymbol(1L, AssetType.BIST_STOCK, "THYAO")).thenReturn(false);
        when(assets.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_asset_user_type_symbol"));
        AssetService service = new AssetService(assets, mock(InvestmentTransactionRepository.class));

        assertThatThrownBy(() -> service.create(1L, AssetType.BIST_STOCK, "thyao", "THY"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Bu varlık zaten kayıtlı");
    }
}
