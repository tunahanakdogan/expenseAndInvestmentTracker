package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class AssetSymbolTest {

    @Test
    void normalizeSymbolTrimsAndUppercases() {
        assertThat(Asset.normalizeSymbol(" thyao ")).isEqualTo("THYAO");
    }

    @Test
    void normalizeSymbolIgnoresTurkishDefaultLocale() {
        Locale previous = Locale.getDefault();
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));
        try {
            assertThat(Asset.normalizeSymbol("isctr")).isEqualTo("ISCTR");
        } finally {
            Locale.setDefault(previous);
        }
    }

    @Test
    void currencyForUsStockIsUsdOthersTry() {
        assertThat(Asset.currencyFor(AssetType.US_STOCK)).isEqualTo("USD");
        assertThat(Asset.currencyFor(AssetType.BIST_STOCK)).isEqualTo("TRY");
        assertThat(Asset.currencyFor(AssetType.FUND)).isEqualTo("TRY");
        assertThat(Asset.currencyFor(AssetType.CURRENCY)).isEqualTo("TRY");
        assertThat(Asset.currencyFor(AssetType.GOLD)).isEqualTo("TRY");
    }
}
