package com.tunahan.finans.investment;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

class AssetControllerTest extends InvestmentApiTestBase {

    @Test
    void createNormalizesSymbolAndSetsCurrency() {
        long user = newUser();

        MvcTestResult bist = postAsset(user, "BIST_STOCK", " thyao ", "Türk Hava Yolları");
        assertThat(bist).hasStatus(HttpStatus.CREATED);
        assertThat(str(bist, "$.symbol")).isEqualTo("THYAO");
        assertThat(str(bist, "$.currency")).isEqualTo("TRY");
        assertThat(str(bist, "$.name")).isEqualTo("Türk Hava Yolları");

        MvcTestResult us = postAsset(user, "US_STOCK", "aapl", "Apple");
        assertThat(us).hasStatus(HttpStatus.CREATED);
        assertThat(str(us, "$.currency")).isEqualTo("USD");

        MvcTestResult currency = postAsset(user, "CURRENCY", "usd", "Dolar");
        assertThat(currency).hasStatus(HttpStatus.CREATED);
        assertThat(str(currency, "$.symbol")).isEqualTo("USD");
        assertThat(str(currency, "$.currency")).isEqualTo("TRY");

        assertThat(postAsset(user, "GOLD", "gram", "Gram altın")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void createRejectsInvalidSymbols() {
        long user = newUser();

        assertRejected(postAsset(user, "BIST_STOCK", "THYAO.IS", "x"), HttpStatus.UNPROCESSABLE_CONTENT,
                "BIST sembolüne .IS ekleme (ör. THYAO)");
        assertRejected(postAsset(user, "GOLD", "XAU", "x"), HttpStatus.UNPROCESSABLE_CONTENT,
                "Altın için sembol GRAM olmalı");
        assertRejected(postAsset(user, "CURRENCY", "TRY", "x"), HttpStatus.UNPROCESSABLE_CONTENT,
                "Döviz sembolü TRY dışında geçerli bir para birimi kodu olmalı (ör. USD)");
        assertRejected(postAsset(user, "CURRENCY", "ABC", "x"), HttpStatus.UNPROCESSABLE_CONTENT,
                "Döviz sembolü TRY dışında geçerli bir para birimi kodu olmalı (ör. USD)");
        assertRejected(postAsset(user, "FUND", "A-B", "x"), HttpStatus.UNPROCESSABLE_CONTENT,
                "Sembol yalnız harf, rakam ve nokta içerebilir");
    }

    @Test
    void createDuplicateReturns422() {
        long user = newUser();
        createAsset(user, "BIST_STOCK", "THYAO", "THY");

        assertRejected(postAsset(user, "BIST_STOCK", "thyao", "THY 2"), HttpStatus.UNPROCESSABLE_CONTENT,
                "Bu varlık zaten kayıtlı");
    }

    @Test
    void createWithBlankNameOrUnknownTypeReturns400() {
        long user = newUser();

        assertThat(postAsset(user, "BIST_STOCK", "THYAO", "")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(postAsset(user, "CRYPTO", "BTC", "Bitcoin")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void listReturnsOnlyOwnAssetsSortedByName() {
        long a = newUser();
        long b = newUser();
        createAsset(a, "BIST_STOCK", "ZZZ", "Zeta");
        createAsset(a, "BIST_STOCK", "AAA", "Alfa");
        createAsset(b, "BIST_STOCK", "BBB", "Beta");

        MvcTestResult result = get(a, "/api/assets");

        assertThat(result).hasStatusOk();
        assertThat(InvestmentApiTestBase.<Integer>path(result, "$.length()")).isEqualTo(2);
        assertThat(str(result, "$[0].name")).isEqualTo("Alfa");
    }

    @Test
    void listIsSortedWithTurkishCollation() {
        long user = newUser();
        createAsset(user, "BIST_STOCK", "SISE", "Şişecam");
        createAsset(user, "BIST_STOCK", "ZOREN", "Zorlu");
        createAsset(user, "BIST_STOCK", "ASELS", "Aselsan");
        createAsset(user, "BIST_STOCK", "CIMSA", "Çimsa");

        MvcTestResult result = get(user, "/api/assets");

        assertThat(InvestmentApiTestBase.<java.util.List<String>>path(result, "$[*].name"))
                .containsExactly("Aselsan", "Çimsa", "Şişecam", "Zorlu");
    }

    @Test
    void renameChangesOnlyName() {
        long user = newUser();
        long id = createAsset(user, "BIST_STOCK", "THYAO", "Türk Hava Yolları");

        MvcTestResult result = put(user, "/api/assets/" + id, """
                {"name": "THY"}
                """);

        assertThat(result).hasStatusOk();
        assertThat(str(result, "$.name")).isEqualTo("THY");
        assertThat(str(result, "$.symbol")).isEqualTo("THYAO");
    }

    @Test
    void otherUsersAssetReturns404() {
        long a = newUser();
        long b = newUser();
        long id = createAsset(a, "BIST_STOCK", "THYAO", "THY");

        assertRejected(put(b, "/api/assets/" + id, """
                {"name": "Benim"}
                """), HttpStatus.NOT_FOUND, "Varlık bulunamadı");
        assertRejected(delete(b, "/api/assets/" + id), HttpStatus.NOT_FOUND, "Varlık bulunamadı");
    }

    @Test
    void deleteRemovesAsset() {
        long user = newUser();
        long id = createAsset(user, "BIST_STOCK", "THYAO", "THY");

        assertThat(delete(user, "/api/assets/" + id)).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(InvestmentApiTestBase.<Integer>path(get(user, "/api/assets"), "$.length()")).isZero();
    }

    @Test
    void deleteAssetWithTransactionsReturns422() {
        long user = newUser();
        long id = createAsset(user, "BIST_STOCK", "THYAO", "THY");
        assertThat(postTx(user, id, "BUY", "2026-01-10", "1", "100", null, null)).hasStatus(HttpStatus.CREATED);

        assertRejected(delete(user, "/api/assets/" + id), HttpStatus.UNPROCESSABLE_CONTENT,
                "İşlemi olan varlık silinemez");
    }

    @Test
    void withoutTokenReturns401() {
        assertThat(mvc.get().uri("/api/assets")).hasStatus(HttpStatus.UNAUTHORIZED);
    }
}
