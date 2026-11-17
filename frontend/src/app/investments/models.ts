// Tüm tutar, adet ve yüzde alanları API'den string gelir ve string gider; frontend'de aritmetik yok.

export type AssetType = 'BIST_STOCK' | 'US_STOCK' | 'FUND' | 'CURRENCY' | 'GOLD';
export type TransactionType = 'BUY' | 'SELL';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  BIST_STOCK: 'BIST hissesi',
  US_STOCK: 'ABD hissesi',
  FUND: 'Fon',
  CURRENCY: 'Döviz',
  GOLD: 'Altın',
};

export interface Asset {
  id: number;
  type: AssetType;
  symbol: string;
  name: string;
  currency: string;
}

export interface NewAsset {
  type: AssetType;
  symbol: string;
  name: string;
}

export interface InvestmentTransaction {
  id: number;
  assetId: number;
  type: TransactionType;
  tradeDate: string;
  quantity: string;
  unitPrice: string;
  commission: string;
  currency: string;
  fxRateTry: string | null;
}

export interface NewTransaction {
  assetId: number;
  type: TransactionType;
  tradeDate: string;
  quantity: string;
  unitPrice: string;
  commission: string;
  fxRateTry: string | null;
}

/** `*Try` alanları yalnız ABD hissesinde dolu; fiyat (ya da kur) yoksa değer ve getiri alanları null. */
export interface PortfolioItem {
  assetId: number;
  type: AssetType;
  symbol: string;
  name: string;
  currency: string;
  quantity: string;
  averageCost: string;
  costBasis: string;
  currentPrice: string | null;
  priceDate: string | null;
  marketValue: string | null;
  unrealizedGain: string | null;
  unrealizedGainPct: string | null;
  realizedGain: string;
  costBasisTry: string | null;
  averageCostTry: string | null;
  marketValueTry: string | null;
  unrealizedGainTry: string | null;
  unrealizedGainPctTry: string | null;
  realizedGainTry: string | null;
}

export interface Portfolio {
  totalCostTry: string;
  totalMarketValueTry: string | null;
  totalUnrealizedGainTry: string | null;
  totalUnrealizedGainPctTry: string | null;
  missingPrices: boolean;
  assets: PortfolioItem[];
}

/** POST /api/pricing/refresh yanıtı; failed: "RATES" (kurlar) veya "TÜR:SEMBOL". */
export interface PriceRefreshResult {
  updatedPrices: number;
  updatedRates: number;
  failed: string[];
}

/** GET /api/pricing/instruments arama sonucu. */
export interface Instrument {
  type: AssetType;
  symbol: string;
  name: string;
  exchange: string;
}
