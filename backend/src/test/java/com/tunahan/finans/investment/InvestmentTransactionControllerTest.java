package com.tunahan.finans.investment;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

class InvestmentTransactionControllerTest extends InvestmentApiTestBase {

    private static final String TX = "/api/investments/transactions";

    @Test
    void buyReturns201WithFixedScaleStrings() {
        long user = newUser();
        long thyao = thyao(user);

        MvcTestResult result = postTx(user, thyao, "BUY", "2026-01-10", "10", "100", "5", null);

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(str(result, "$.quantity")).isEqualTo("10.00000000");
        assertThat(str(result, "$.unitPrice")).isEqualTo("100.00000000");
        assertThat(str(result, "$.commission")).isEqualTo("5.0000");
        assertThat(str(result, "$.currency")).isEqualTo("TRY");
        assertThat(str(result, "$.fxRateTry")).isNull();
        assertThat(str(result, "$.tradeDate")).isEqualTo("2026-01-10");
        assertThat(str(result, "$.type")).isEqualTo("BUY");
    }

    @Test
    void commissionDefaultsToZero() {
        long user = newUser();

        MvcTestResult result = postTx(user, thyao(user), "BUY", "2026-01-10", "10", "100", null, null);

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(str(result, "$.commission")).isEqualTo("0.0000");
    }

    @Test
    void fractionalQuantityIsStoredExactly() {
        long user = newUser();
        long thyao = thyao(user);

        MvcTestResult result = postTx(user, thyao, "BUY", "2026-01-10", "0.12345678", "150.25", "1", null);

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(str(result, "$.quantity")).isEqualTo("0.12345678");
        assertThat(str(get(user, TX + "?assetId=" + thyao), "$[0].quantity")).isEqualTo("0.12345678");
    }

    @Test
    void sellMoreThanHeldReturns422() {
        long user = newUser();
        long thyao = thyao(user);
        created(postTx(user, thyao, "BUY", "2026-01-10", "10", "100", null, null));

        assertRejected(postTx(user, thyao, "SELL", "2026-01-11", "10.5", "100", null, null),
                HttpStatus.UNPROCESSABLE_CONTENT, "Eldeki adetten fazla satılamaz");
    }

    @Test
    void sellWithNoHoldingReturns422() {
        long user = newUser();

        assertRejected(postTx(user, thyao(user), "SELL", "2026-01-11", "1", "100", null, null),
                HttpStatus.UNPROCESSABLE_CONTENT, "Eldeki adetten fazla satılamaz");
    }

    @Test
    void backdatedSellThatBreaksLaterSellReturns422() {
        long user = newUser();
        long thyao = thyao(user);
        created(postTx(user, thyao, "BUY", "2026-01-10", "10", "100", null, null));
        created(postTx(user, thyao, "SELL", "2026-02-10", "10", "110", null, null));

        assertRejected(postTx(user, thyao, "SELL", "2026-01-20", "5", "105", null, null),
                HttpStatus.UNPROCESSABLE_CONTENT, "Eldeki adetten fazla satılamaz");
        assertThat(count(get(user, TX + "?assetId=" + thyao))).isEqualTo(2);
    }

    @Test
    void backdatedBuyIsAccepted() {
        long user = newUser();
        long thyao = thyao(user);
        created(postTx(user, thyao, "BUY", "2026-02-01", "5", "100", null, null));

        created(postTx(user, thyao, "BUY", "2026-01-01", "5", "90", null, null));
    }

    @Test
    void sameDaySellAfterBuyIsAccepted() {
        long user = newUser();
        long thyao = thyao(user);

        created(postTx(user, thyao, "BUY", "2026-01-10", "10", "100", null, null));
        created(postTx(user, thyao, "SELL", "2026-01-10", "10", "101", null, null));
    }

    @Test
    void deletingBuyNeededByLaterSellReturns422() {
        long user = newUser();
        long thyao = thyao(user);
        long buy = created(postTx(user, thyao, "BUY", "2026-01-10", "10", "100", null, null));
        long sell = created(postTx(user, thyao, "SELL", "2026-02-10", "10", "110", null, null));

        assertRejected(delete(user, TX + "/" + buy), HttpStatus.UNPROCESSABLE_CONTENT,
                "Bu işlem silinirse eldeki adet eksiye düşer");
        assertThat(count(get(user, TX + "?assetId=" + thyao))).isEqualTo(2);

        assertThat(delete(user, TX + "/" + sell)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(delete(user, TX + "/" + buy)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(count(get(user, TX + "?assetId=" + thyao))).isZero();
    }

    @Test
    void deletingUsStockBuyNeededByLaterSellReturns422() {
        long user = newUser();
        long aapl = createAsset(user, "US_STOCK", "AAPL", "Apple");
        long buy = created(postTx(user, aapl, "BUY", "2026-01-10", "2", "200", "1", "30"));
        long sell = created(postTx(user, aapl, "SELL", "2026-02-10", "2", "250", "1", "34"));

        assertRejected(delete(user, TX + "/" + buy), HttpStatus.UNPROCESSABLE_CONTENT,
                "Bu işlem silinirse eldeki adet eksiye düşer");

        assertThat(delete(user, TX + "/" + sell)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(delete(user, TX + "/" + buy)).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void backdatedSellOnUsStockChainReturns422() {
        long user = newUser();
        long aapl = createAsset(user, "US_STOCK", "AAPL", "Apple");
        created(postTx(user, aapl, "BUY", "2026-01-10", "2", "200", "1", "30"));
        created(postTx(user, aapl, "SELL", "2026-02-10", "2", "250", "1", "34"));

        assertRejected(postTx(user, aapl, "SELL", "2026-01-20", "1", "220", "1", "32"),
                HttpStatus.UNPROCESSABLE_CONTENT, "Eldeki adetten fazla satılamaz");
        assertThat(count(get(user, TX + "?assetId=" + aapl))).isEqualTo(2);
    }

    @Test
    void newSameDayBuyIsProcessedAfterExistingSameDaySell() {
        long user = newUser();
        long thyao = thyao(user);
        created(postTx(user, thyao, "BUY", "2026-01-10", "10", "100", null, null));
        created(postTx(user, thyao, "SELL", "2026-02-10", "10", "110", null, null));

        created(postTx(user, thyao, "BUY", "2026-02-10", "5", "50", null, null));

        // Satış önce işlenir: pozisyon kapanır, ortalama yeni alıştan kurulur (alış önce olsaydı 83,33 olurdu).
        MvcTestResult portfolio = get(user, "/api/portfolio");
        assertThat(str(portfolio, "$.assets[0].quantity")).isEqualTo("5.00000000");
        assertThat(str(portfolio, "$.assets[0].averageCost")).isEqualTo("50.0000");
        assertThat(str(portfolio, "$.assets[0].realizedGain")).isEqualTo("100.0000");
    }

    @Test
    void todayInIstanbulIsAccepted() {
        long user = newUser();
        String today = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Istanbul")).toString();

        created(postTx(user, thyao(user), "BUY", today, "1", "100", null, null));
    }

    @Test
    void usStockRequiresFxRate() {
        long user = newUser();
        long aapl = createAsset(user, "US_STOCK", "AAPL", "Apple");

        assertRejected(postTx(user, aapl, "BUY", "2026-01-10", "2", "200", "1", null),
                HttpStatus.UNPROCESSABLE_CONTENT, "ABD hissesi işleminde USD/TRY kuru zorunlu");

        MvcTestResult result = postTx(user, aapl, "BUY", "2026-01-10", "2", "200", "1", "34.1234");
        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(str(result, "$.fxRateTry")).isEqualTo("34.12340000");
        assertThat(str(result, "$.currency")).isEqualTo("USD");
    }

    @Test
    void fxRateIsIgnoredForNonUsAsset() {
        long user = newUser();

        MvcTestResult result = postTx(user, thyao(user), "BUY", "2026-01-10", "10", "100", null, "34");

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(str(result, "$.fxRateTry")).isNull();
    }

    @Test
    void invalidNumbersReturn400() {
        long user = newUser();
        long thyao = thyao(user);

        assertThat(postTx(user, thyao, "BUY", "2026-01-10", "0", "100", null, null)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(postTx(user, thyao, "BUY", "2026-01-10", "-1", "100", null, null)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(postTx(user, thyao, "BUY", "2026-01-10", "1.123456789", "100", null, null))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(postTx(user, thyao, "BUY", "2026-01-10", "1", "0", null, null)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(postTx(user, thyao, "BUY", "2026-01-10", "1", "100", "-1", null)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void futureDateReturns422() {
        long user = newUser();

        assertRejected(postTx(user, thyao(user), "BUY", "2999-01-01", "1", "100", null, null),
                HttpStatus.UNPROCESSABLE_CONTENT, "İşlem tarihi gelecekte olamaz");
    }

    @Test
    void listIsNewestFirstAndFilteredByAsset() {
        long user = newUser();
        long thyao = thyao(user);
        long garan = createAsset(user, "BIST_STOCK", "GARAN", "Garanti");
        created(postTx(user, thyao, "BUY", "2026-01-10", "10", "100", null, null));
        created(postTx(user, thyao, "BUY", "2026-03-01", "5", "120", null, null));
        created(postTx(user, garan, "BUY", "2026-02-01", "1", "50", null, null));

        MvcTestResult filtered = get(user, TX + "?assetId=" + thyao);
        assertThat(filtered).hasStatusOk();
        assertThat(count(filtered)).isEqualTo(2);
        assertThat(str(filtered, "$[0].tradeDate")).isEqualTo("2026-03-01");

        assertThat(count(get(user, TX))).isEqualTo(3);
    }

    @Test
    void otherUsersDataReturns404() {
        long a = newUser();
        long b = newUser();
        long thyao = thyao(a);
        long tx = created(postTx(a, thyao, "BUY", "2026-01-10", "10", "100", null, null));

        assertRejected(postTx(b, thyao, "BUY", "2026-01-10", "1", "100", null, null),
                HttpStatus.NOT_FOUND, "Varlık bulunamadı");
        assertRejected(delete(b, TX + "/" + tx), HttpStatus.NOT_FOUND, "İşlem bulunamadı");
        assertThat(get(b, TX + "?assetId=" + thyao)).hasStatus(HttpStatus.NOT_FOUND);
    }

    private long thyao(long userId) {
        return createAsset(userId, "BIST_STOCK", "THYAO", "Türk Hava Yolları");
    }

    private static long created(MvcTestResult result) {
        assertThat(result).hasStatus(HttpStatus.CREATED);
        return ((Number) path(result, "$.id")).longValue();
    }

    private static int count(MvcTestResult result) {
        return path(result, "$.length()");
    }
}
