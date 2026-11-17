package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.Comparator;
import java.util.Currency;
import java.util.List;
import java.util.Locale;

/** Yeni varlık eklerken yazdıkça öneri: hisse (Yahoo), fon (TEFAS), döviz (TCMB kurları), altın. */
@Service
class InstrumentSearchService {

    static final int MAX_RESULTS = 20;
    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final Instrument GOLD = new Instrument(AssetType.GOLD, "GRAM", "Gram altın", "");

    private final YahooSymbolSearch stocks;
    private final TefasFundCatalog funds;
    private final ExchangeRateRepository rates;

    InstrumentSearchService(YahooSymbolSearch stocks, TefasFundCatalog funds, ExchangeRateRepository rates) {
        this.stocks = stocks;
        this.funds = funds;
        this.rates = rates;
    }

    List<Instrument> search(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.strip();
        if (query.length() < 2) {
            return List.of();
        }
        List<Instrument> all = new ArrayList<>(stocks.search(query));
        all.addAll(funds.search(query));
        all.addAll(currencies(query));
        if (SearchText.matches("Gram altın gold", query)) {
            all.add(GOLD);
        }
        String code = SearchText.normalize(query);
        // Kodu birebir eşleşenler önce; geri kalan sıra kaynak sırasıdır (stabil sıralama).
        return all.stream()
                .sorted(Comparator.comparing((Instrument i) -> !SearchText.normalize(i.symbol()).equals(code)))
                .limit(MAX_RESULTS)
                .toList();
    }

    private List<Instrument> currencies(String query) {
        String code = SearchText.normalize(query);
        return rates.findDistinctCurrencies().stream()
                .sorted()
                .map(c -> new Instrument(AssetType.CURRENCY, c, currencyName(c), "TCMB"))
                .filter(i -> SearchText.normalize(i.symbol()).startsWith(code) || SearchText.matches(i.name(), query))
                .toList();
    }

    /** JDK "ABD doları" verir; arayüzde "ABD Doları". */
    private static String currencyName(String code) {
        try {
            return Arrays.stream(Currency.getInstance(code).getDisplayName(TR).split(" "))
                    .map(w -> w.isEmpty() ? w : w.substring(0, 1).toUpperCase(TR) + w.substring(1))
                    .collect(Collectors.joining(" "));
        } catch (IllegalArgumentException e) {
            return code;
        }
    }
}
