package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.pricing.PricePoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class PortfolioControllerTest extends InvestmentApiTestBase {

    private static final LocalDate PRICE_DATE = LocalDate.parse("2026-11-13");

    @BeforeEach
    void noPricesByDefault() {
        Mockito.reset(prices);
        when(prices.latestPrice(any(), any())).thenReturn(Optional.empty());
        when(prices.rateToTry(any(), any())).thenReturn(Optional.empty());
    }

    @Test
    void portfolioWithPricesReturnsPositionsAndTryTotals() {
        long user = newUser();
        seedThyaoAndAapl(user);
        thyaoPrice();
        aaplPrice();
        usdRate();

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.assets[1].symbol")).isEqualTo("THYAO");
        assertThat(str(r, "$.assets[1].quantity")).isEqualTo("15.00000000");
        assertThat(str(r, "$.assets[1].averageCost")).isEqualTo("110.6000");
        assertThat(str(r, "$.assets[1].costBasis")).isEqualTo("1659.0000");
        assertThat(str(r, "$.assets[1].currentPrice")).isEqualTo("130.00000000");
        assertThat(str(r, "$.assets[1].priceDate")).isEqualTo("2026-11-13");
        assertThat(str(r, "$.assets[1].marketValue")).isEqualTo("1950.0000");
        assertThat(str(r, "$.assets[1].unrealizedGain")).isEqualTo("291.0000");
        assertThat(str(r, "$.assets[1].unrealizedGainPct")).isEqualTo("17.54");
        assertThat(str(r, "$.assets[1].realizedGain")).isEqualTo("194.0000");
        assertNull(r, "$.assets[1].", "costBasisTry", "averageCostTry", "marketValueTry", "unrealizedGainTry",
                "unrealizedGainPctTry", "realizedGainTry");

        assertThat(str(r, "$.assets[0].symbol")).isEqualTo("AAPL");
        assertThat(str(r, "$.assets[0].currency")).isEqualTo("USD");
        assertThat(str(r, "$.assets[0].quantity")).isEqualTo("3.00000000");
        assertThat(str(r, "$.assets[0].averageCost")).isEqualTo("225.5000");
        assertThat(str(r, "$.assets[0].costBasis")).isEqualTo("676.5000");
        assertThat(str(r, "$.assets[0].currentPrice")).isEqualTo("310.00000000");
        assertThat(str(r, "$.assets[0].marketValue")).isEqualTo("930.0000");
        assertThat(str(r, "$.assets[0].unrealizedGain")).isEqualTo("253.5000");
        assertThat(str(r, "$.assets[0].unrealizedGainPct")).isEqualTo("37.47");
        assertThat(str(r, "$.assets[0].realizedGain")).isEqualTo("72.5000");
        assertThat(str(r, "$.assets[0].costBasisTry")).isEqualTo("21798.0000");
        assertThat(str(r, "$.assets[0].averageCostTry")).isEqualTo("7266.0000");
        assertThat(str(r, "$.assets[0].marketValueTry")).isEqualTo("38130.0000");
        assertThat(str(r, "$.assets[0].unrealizedGainTry")).isEqualTo("16332.0000");
        assertThat(str(r, "$.assets[0].unrealizedGainPctTry")).isEqualTo("74.92");
        assertThat(str(r, "$.assets[0].realizedGainTry")).isEqualTo("4654.0000");

        assertThat(str(r, "$.totalCostTry")).isEqualTo("23457.0000");
        assertThat(str(r, "$.totalMarketValueTry")).isEqualTo("40080.0000");
        assertThat(str(r, "$.totalUnrealizedGainTry")).isEqualTo("16623.0000");
        assertThat(str(r, "$.totalUnrealizedGainPctTry")).isEqualTo("70.87");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isFalse();
    }

    @Test
    void assetWithoutPriceIsListedWithNullValueAndExcludedFromTotal() {
        long user = newUser();
        seedThyaoAndAapl(user);
        aaplPrice();
        usdRate();

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.assets[1].quantity")).isEqualTo("15.00000000");
        assertThat(str(r, "$.assets[1].costBasis")).isEqualTo("1659.0000");
        assertThat(str(r, "$.assets[1].realizedGain")).isEqualTo("194.0000");
        assertNull(r, "$.assets[1].", "currentPrice", "priceDate", "marketValue", "unrealizedGain",
                "unrealizedGainPct");
        assertThat(str(r, "$.totalCostTry")).isEqualTo("23457.0000");
        assertThat(str(r, "$.totalMarketValueTry")).isEqualTo("38130.0000");
        assertThat(str(r, "$.totalUnrealizedGainTry")).isEqualTo("16332.0000");
        assertThat(str(r, "$.totalUnrealizedGainPctTry")).isEqualTo("74.92");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isTrue();
    }

    @Test
    void usStockWithPriceButNoRateHasUsdValueOnly() {
        long user = newUser();
        seedThyaoAndAapl(user);
        thyaoPrice();
        aaplPrice();

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.assets[0].marketValue")).isEqualTo("930.0000");
        assertThat(str(r, "$.assets[0].unrealizedGainPct")).isEqualTo("37.47");
        assertThat(str(r, "$.assets[0].costBasisTry")).isEqualTo("21798.0000");
        assertNull(r, "$.assets[0].", "marketValueTry", "unrealizedGainTry", "unrealizedGainPctTry");
        assertThat(str(r, "$.totalMarketValueTry")).isEqualTo("1950.0000");
        assertThat(str(r, "$.totalUnrealizedGainTry")).isEqualTo("291.0000");
        assertThat(str(r, "$.totalUnrealizedGainPctTry")).isEqualTo("17.54");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isTrue();
    }

    @Test
    void noPricesAtAllGivesNullTotals() {
        long user = newUser();
        seedThyaoAndAapl(user);

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.totalCostTry")).isEqualTo("23457.0000");
        assertNull(r, "$.", "totalMarketValueTry", "totalUnrealizedGainTry", "totalUnrealizedGainPctTry");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isTrue();
    }

    @Test
    void emptyPortfolioReturnsZeroTotals() {
        MvcTestResult r = portfolio(newUser());

        assertThat(InvestmentApiTestBase.<Integer>path(r, "$.assets.length()")).isZero();
        assertThat(str(r, "$.totalCostTry")).isEqualTo("0.0000");
        assertThat(str(r, "$.totalMarketValueTry")).isEqualTo("0.0000");
        assertThat(str(r, "$.totalUnrealizedGainTry")).isEqualTo("0.0000");
        assertNull(r, "$.", "totalUnrealizedGainPctTry");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isFalse();
    }

    @Test
    void fullySoldAssetIsListedWithZeroes() {
        long user = newUser();
        long aft = createAsset(user, "FUND", "AFT", "Ak Portföy Yeni Teknolojiler");
        tx(user, aft, "BUY", "2026-01-05", "10", "100", "5", null);
        tx(user, aft, "SELL", "2026-02-02", "10", "110", "0", null);

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.assets[0].quantity")).isEqualTo("0.00000000");
        assertThat(str(r, "$.assets[0].averageCost")).isEqualTo("0.0000");
        assertThat(str(r, "$.assets[0].costBasis")).isEqualTo("0.0000");
        assertThat(str(r, "$.assets[0].marketValue")).isEqualTo("0.0000");
        assertThat(str(r, "$.assets[0].unrealizedGain")).isEqualTo("0.0000");
        assertNull(r, "$.assets[0].", "unrealizedGainPct");
        assertThat(str(r, "$.assets[0].realizedGain")).isEqualTo("95.0000");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isFalse();
        assertThat(str(r, "$.totalMarketValueTry")).isEqualTo("0.0000");
    }

    @Test
    void assetWithoutTransactionsIsListed() {
        long user = newUser();
        createAsset(user, "BIST_STOCK", "THYAO", "Türk Hava Yolları");

        MvcTestResult r = portfolio(user);

        assertThat(InvestmentApiTestBase.<Integer>path(r, "$.assets.length()")).isEqualTo(1);
        assertThat(str(r, "$.assets[0].quantity")).isEqualTo("0.00000000");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isFalse();
    }

    @Test
    void currencyAssetIsValuedWithExchangeRate() {
        long user = newUser();
        long usd = createAsset(user, "CURRENCY", "USD", "Dolar");
        tx(user, usd, "BUY", "2026-01-05", "1000", "34.5", "0", null);
        when(prices.latestPrice(AssetType.CURRENCY, "USD"))
                .thenReturn(Optional.of(new PricePoint(new BigDecimal("41"), "TRY", PRICE_DATE)));

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.assets[0].currency")).isEqualTo("TRY");
        assertThat(str(r, "$.assets[0].costBasis")).isEqualTo("34500.0000");
        assertThat(str(r, "$.assets[0].averageCost")).isEqualTo("34.5000");
        assertThat(str(r, "$.assets[0].marketValue")).isEqualTo("41000.0000");
        assertThat(str(r, "$.assets[0].unrealizedGain")).isEqualTo("6500.0000");
        assertThat(str(r, "$.assets[0].unrealizedGainPct")).isEqualTo("18.84");
        assertNull(r, "$.assets[0].", "costBasisTry");
        assertThat(str(r, "$.totalMarketValueTry")).isEqualTo("41000.0000");
    }

    @Test
    void priceInDifferentCurrencyIsTreatedAsMissing() {
        long user = newUser();
        long thyao = createAsset(user, "BIST_STOCK", "THYAO", "Türk Hava Yolları");
        tx(user, thyao, "BUY", "2026-01-05", "10", "100", "0", null);
        // TRY varlığa USD fiyat: adetle çarpılırsa anlamsız bir TL değeri çıkar.
        when(prices.latestPrice(AssetType.BIST_STOCK, "THYAO"))
                .thenReturn(Optional.of(new PricePoint(new BigDecimal("3"), "USD", PRICE_DATE)));

        MvcTestResult r = portfolio(user);

        assertThat(str(r, "$.assets[0].costBasis")).isEqualTo("1000.0000");
        assertNull(r, "$.assets[0].", "currentPrice", "priceDate", "marketValue", "unrealizedGain",
                "unrealizedGainPct");
        assertNull(r, "$.", "totalMarketValueTry");
        assertThat(InvestmentApiTestBase.<Boolean>path(r, "$.missingPrices")).isTrue();
    }

    @Test
    void portfolioIsPerUser() {
        seedThyaoAndAapl(newUser());

        assertThat(InvestmentApiTestBase.<Integer>path(portfolio(newUser()), "$.assets.length()")).isZero();
    }

    private MvcTestResult portfolio(long userId) {
        MvcTestResult result = get(userId, "/api/portfolio");
        assertThat(result).hasStatusOk();
        return result;
    }

    private static void assertNull(MvcTestResult result, String prefix, String... fields) {
        for (String field : fields) {
            assertThat(InvestmentApiTestBase.<Object>path(result, prefix + field)).as(field).isNull();
        }
    }

    private void tx(long user, long asset, String type, String date, String qty, String price, String commission,
                    String fx) {
        assertThat(postTx(user, asset, type, date, qty, price, commission, fx)).hasStatus(HttpStatus.CREATED);
    }

    private void seedThyaoAndAapl(long user) {
        long thyao = createAsset(user, "BIST_STOCK", "THYAO", "Türk Hava Yolları");
        tx(user, thyao, "BUY", "2026-01-05", "10", "100", "5", null);
        tx(user, thyao, "BUY", "2026-01-12", "10", "120", "7", null);
        tx(user, thyao, "SELL", "2026-02-02", "5", "150", "3", null);
        long aapl = createAsset(user, "US_STOCK", "AAPL", "Apple");
        tx(user, aapl, "BUY", "2026-01-05", "2", "200", "1", "30");
        tx(user, aapl, "BUY", "2026-01-12", "2", "250", "1", "34");
        tx(user, aapl, "SELL", "2026-02-02", "1", "300", "2", "40");
    }

    private void thyaoPrice() {
        when(prices.latestPrice(AssetType.BIST_STOCK, "THYAO"))
                .thenReturn(Optional.of(new PricePoint(new BigDecimal("130"), "TRY", PRICE_DATE)));
    }

    private void aaplPrice() {
        when(prices.latestPrice(AssetType.US_STOCK, "AAPL"))
                .thenReturn(Optional.of(new PricePoint(new BigDecimal("310"), "USD", PRICE_DATE)));
    }

    private void usdRate() {
        when(prices.rateToTry(eq("USD"), any())).thenReturn(Optional.of(new BigDecimal("41")));
    }
}
