package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.pricing.TrackedAssetSource.TrackedAsset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Saglayicilari sirayla calistirir; biri patlayinca digerleri surer. Istisna disari cikmaz. */
@Service
class PriceRefreshService {

    /** Kur ardindan fiyatlar bu sirayla cekilir. */
    private static final List<AssetType> PRICE_TYPES =
            List.of(AssetType.BIST_STOCK, AssetType.US_STOCK, AssetType.GOLD, AssetType.FUND);

    private static final Logger log = LoggerFactory.getLogger(PriceRefreshService.class);

    private final List<PriceProvider> providers;
    private final ExchangeRateProvider rateProvider;
    private final PriceWriter writer;
    private final ObjectProvider<TrackedAssetSource> trackedSources;

    PriceRefreshService(List<PriceProvider> providers, ExchangeRateProvider rateProvider, PriceWriter writer,
                        ObjectProvider<TrackedAssetSource> trackedSources) {
        this.providers = providers;
        this.rateProvider = rateProvider;
        this.writer = writer;
        this.trackedSources = trackedSources;
    }

    /** failed: kur icin "RATES", fiyat icin "BIST_STOCK:THYAO". */
    record RefreshResult(int updatedPrices, int updatedRates, List<String> failed) {
    }

    RefreshResult refreshRates() {
        try {
            Map<String, BigDecimal> rates = rateProvider.fetchRates();
            if (rates == null || rates.isEmpty()) {
                return new RefreshResult(0, 0, List.of("RATES"));
            }
            int saved = 0;
            for (Map.Entry<String, BigDecimal> e : rates.entrySet()) {
                try {
                    writer.saveRate(e.getKey(), e.getValue(), rateProvider.source());
                    saved++;
                } catch (RuntimeException ex) {
                    log.warn("Kur yazilamadi: {}", e.getKey(), ex);
                }
            }
            return new RefreshResult(0, saved, saved == 0 ? List.of("RATES") : List.of());
        } catch (RuntimeException e) {
            log.warn("Kur yenileme basarisiz", e);
            return new RefreshResult(0, 0, List.of("RATES"));
        }
    }

    RefreshResult refreshPrices(Set<AssetType> types) {
        Map<AssetType, Set<String>> wanted = new EnumMap<>(AssetType.class);
        for (TrackedAsset asset : trackedAssets()) {
            if (asset.type() != AssetType.CURRENCY && types.contains(asset.type())) {
                wanted.computeIfAbsent(asset.type(), t -> new LinkedHashSet<>()).add(asset.symbol());
            }
        }
        int updated = 0;
        List<String> failed = new ArrayList<>();
        for (AssetType type : PRICE_TYPES) {
            Set<String> symbols = wanted.get(type);
            if (symbols == null) {
                continue;
            }
            PriceProvider provider = providers.stream().filter(p -> p.supports(type)).findFirst().orElse(null);
            if (provider == null) {
                continue;
            }
            Map<String, BigDecimal> fetched = fetch(provider, type, symbols);
            String currency = type == AssetType.US_STOCK ? "USD" : "TRY";
            for (String symbol : symbols) {
                BigDecimal price = fetched.get(symbol);
                if (price == null) {
                    failed.add(type + ":" + symbol);
                    continue;
                }
                try {
                    writer.savePrice(type, symbol, price, currency, provider.source());
                    updated++;
                } catch (RuntimeException e) {
                    log.warn("Fiyat yazilamadi: {}:{}", type, symbol, e);
                    failed.add(type + ":" + symbol);
                }
            }
        }
        return new RefreshResult(updated, 0, failed);
    }

    RefreshResult refreshAll() {
        RefreshResult rates = refreshRates();
        RefreshResult prices = refreshPrices(Set.copyOf(PRICE_TYPES));
        List<String> failed = new ArrayList<>(rates.failed());
        failed.addAll(prices.failed());
        return new RefreshResult(prices.updatedPrices(), rates.updatedRates(), failed);
    }

    private Map<String, BigDecimal> fetch(PriceProvider provider, AssetType type, Set<String> symbols) {
        try {
            Map<String, BigDecimal> result = provider.fetchPrices(symbols);
            return result == null ? Map.of() : result;
        } catch (RuntimeException e) {
            log.warn("{} fiyat saglayicisi basarisiz", type, e);
            return Map.of();
        }
    }

    private List<TrackedAsset> trackedAssets() {
        try {
            return trackedSources.stream().flatMap(s -> s.trackedAssets().stream()).toList();
        } catch (RuntimeException e) {
            log.warn("Takip edilen varliklar okunamadi", e);
            return List.of();
        }
    }
}
