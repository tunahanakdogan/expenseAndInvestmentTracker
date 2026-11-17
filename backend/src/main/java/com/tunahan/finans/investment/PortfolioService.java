package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.common.Money;
import com.tunahan.finans.investment.PositionCalculator.Position;
import com.tunahan.finans.pricing.PricePoint;
import com.tunahan.finans.pricing.PriceQueryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Portföy saklanmaz: her istekte işlemlerden hesaplanır, güncel fiyatla değerlenir.
 * Hesaplar 8 haneli ara değerlerle yapılır; 4 (tutar) ve 2 (yüzde) haneye yalnız yanıta yazarken yuvarlanır.
 */
@Service
class PortfolioService {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final AssetService assets;
    private final InvestmentTransactionService transactions;
    private final PriceQueryService prices;

    PortfolioService(AssetService assets, InvestmentTransactionService transactions, PriceQueryService prices) {
        this.assets = assets;
        this.transactions = transactions;
        this.prices = prices;
    }

    /** Toplamlar TRY; değeri hesaplanamayan varlık değer ve getiri toplamına katılmaz ({@code missingPrices}). */
    record PortfolioResponse(BigDecimal totalCostTry, BigDecimal totalMarketValueTry,
                             BigDecimal totalUnrealizedGainTry, BigDecimal totalUnrealizedGainPctTry,
                             boolean missingPrices, List<PortfolioItem> assets, List<Allocation> allocation) {
    }

    /** Elde olup TRY değeri bilinen varlıkların türe göre dağılımı; değere göre azalan. */
    record Allocation(AssetType type, BigDecimal valueTry, BigDecimal sharePct) {
    }

    /** {@code *Try} alanları yalnız ABD hissesinde dolu; fiyat (ya da kur) yoksa değer ve getiri alanları null. */
    record PortfolioItem(Long assetId, AssetType type, String symbol, String name, String currency,
                         BigDecimal quantity, BigDecimal averageCost, BigDecimal costBasis,
                         BigDecimal currentPrice, LocalDate priceDate, BigDecimal marketValue,
                         BigDecimal unrealizedGain, BigDecimal unrealizedGainPct, BigDecimal realizedGain,
                         BigDecimal costBasisTry, BigDecimal averageCostTry, BigDecimal marketValueTry,
                         BigDecimal unrealizedGainTry, BigDecimal unrealizedGainPctTry, BigDecimal realizedGainTry) {
    }

    @Transactional(readOnly = true)
    PortfolioResponse portfolio(Long userId) {
        List<Asset> userAssets = assets.list(userId);
        // Kur yalnız ABD hissesi varsa ve istek başına bir kez sorulur.
        BigDecimal usdTry = userAssets.stream().anyMatch(a -> a.getType() == AssetType.US_STOCK)
                ? prices.rateToTry("USD", LocalDate.now(ISTANBUL)).orElse(null)
                : null;

        List<PortfolioItem> items = new ArrayList<>();
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal valuedCost = BigDecimal.ZERO;
        BigDecimal totalValue = BigDecimal.ZERO;
        boolean anyHeld = false;
        boolean anyHeldValued = false;
        boolean missingPrices = false;
        Map<AssetType, BigDecimal> valueByType = new EnumMap<>(AssetType.class);

        for (Asset asset : userAssets) {
            boolean usStock = asset.getType() == AssetType.US_STOCK;
            Position pos = PositionCalculator.calculate(transactions.tradesOf(userId, asset.getId()), usStock);
            boolean held = pos.quantity().signum() > 0;
            // Fiyat varlığın para biriminde değilse adetle çarpmak yanlış tutar üretir; "fiyat yok" sayılır.
            Optional<PricePoint> price = prices.latestPrice(asset.getType(), asset.getSymbol())
                    .filter(p -> p.currency().equals(asset.getCurrency()));

            BigDecimal marketValue = !held ? BigDecimal.ZERO
                    : price.map(p -> pos.quantity().multiply(p.price())).orElse(null);
            BigDecimal gain = gain(marketValue, pos.costBasis());

            BigDecimal marketValueTry = null;
            if (usStock) {
                marketValueTry = !held ? BigDecimal.ZERO
                        : marketValue == null || usdTry == null ? null : marketValue.multiply(usdTry);
            }
            BigDecimal gainTry = usStock ? gain(marketValueTry, pos.costBasisTry()) : null;

            BigDecimal costInTry = usStock ? pos.costBasisTry() : pos.costBasis();
            BigDecimal valueInTry = usStock ? marketValueTry : marketValue;
            totalCost = totalCost.add(costInTry);
            if (valueInTry != null) {
                totalValue = totalValue.add(valueInTry);
                valuedCost = valuedCost.add(costInTry);
            }
            if (held) {
                anyHeld = true;
                anyHeldValued |= valueInTry != null;
                missingPrices |= valueInTry == null;
                if (valueInTry != null && valueInTry.signum() > 0) {
                    valueByType.merge(asset.getType(), valueInTry, BigDecimal::add);
                }
            }

            items.add(new PortfolioItem(asset.getId(), asset.getType(), asset.getSymbol(), asset.getName(),
                    asset.getCurrency(),
                    pos.quantity().setScale(8, Money.ROUNDING),
                    amount(pos.averageCost()), amount(pos.costBasis()),
                    price.map(p -> p.price().setScale(8, Money.ROUNDING)).orElse(null),
                    price.map(PricePoint::date).orElse(null),
                    amount(marketValue), amount(gain), pct(gain, pos.costBasis()), amount(pos.realizedGain()),
                    amount(pos.costBasisTry()), amount(pos.averageCostTry()), amount(marketValueTry),
                    amount(gainTry), usStock ? pct(gainTry, pos.costBasisTry()) : null,
                    amount(pos.realizedGainTry())));
        }

        // Elde varlık varken hiçbiri değerlenemiyorsa "0" yanıltır; toplam değer bilinmiyor demektir.
        boolean valueKnown = !anyHeld || anyHeldValued;
        BigDecimal totalGain = valueKnown ? totalValue.subtract(valuedCost) : null;
        BigDecimal allocatedTotal = valueByType.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Allocation> allocation = valueByType.entrySet().stream()
                .sorted(Map.Entry.<AssetType, BigDecimal>comparingByValue().reversed())
                .map(e -> new Allocation(e.getKey(), amount(e.getValue()),
                        e.getValue().multiply(HUNDRED).divide(allocatedTotal, 2, Money.ROUNDING)))
                .toList();
        return new PortfolioResponse(amount(totalCost), valueKnown ? amount(totalValue) : null,
                amount(totalGain), pct(totalGain, valuedCost), missingPrices, items, allocation);
    }

    private static BigDecimal gain(BigDecimal marketValue, BigDecimal costBasis) {
        return marketValue == null ? null : marketValue.subtract(costBasis);
    }

    private static BigDecimal amount(BigDecimal value) {
        return value == null ? null : value.setScale(4, Money.ROUNDING);
    }

    /** Maliyet 0 ise (pozisyon kapalı) yüzde tanımsız. */
    private static BigDecimal pct(BigDecimal gain, BigDecimal costBasis) {
        if (gain == null || costBasis.signum() == 0) {
            return null;
        }
        return gain.multiply(HUNDRED).divide(costBasis, 2, Money.ROUNDING);
    }
}
