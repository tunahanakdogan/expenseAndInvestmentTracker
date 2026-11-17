package com.tunahan.finans.pricing;

import com.tunahan.finans.common.AssetType;

/** Arama sonucu: eklenebilecek bir varlık. {@code exchange} yalnızca gösterim için (IST, NASDAQ, TEFAS…). */
record Instrument(AssetType type, String symbol, String name, String exchange) {
}
