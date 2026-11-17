# Varlık arama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Yeni varlık eklerken yazdıkça öneren arama (hisse/fon/döviz/altın).
**Spec:** `docs/superpowers/specs/2026-11-17-varlik-arama-design.md`

## Global Constraints
- Yeni kütüphane yok; dış çağrılar `pricingRestClient`; testlerde gerçek uç yok.
- TEFAS isteği gövdesi String (Content-Length; chunked → 500).

## Review Focus
- Türkçe karakterli sorgu URL'de doğru kodlanmalı ("türk hava").
- TEFAS hatası önbelleğe "boş liste" olarak yazılmamalı (bir sonraki aramada yeniden denenmeli).
- Yahoo çökünce fon/döviz sonuçları yine dönmeli.

### Task 1: Backend (`pricing`)
- `SearchText.normalize(String)`, `Instrument(AssetType type, String symbol, String name, String exchange)`,
  `YahooSymbolSearch.search(String q): List<Instrument>`, `TefasFundCatalog.search(String q): List<Instrument>` (günlük önbellek),
  `InstrumentSearchService.search(String q): List<Instrument>` (birleştir, birebir kod önce, en çok 20, `q` < 2 → boş),
  `ExchangeRateRepository.findDistinctCurrencies()`, `InstrumentController` `GET /api/pricing/instruments?q=`.
- Testler: `SearchTextTest`, `YahooSymbolSearchTest`, `TefasFundCatalogTest`, `InstrumentSearchServiceTest`, `InstrumentControllerTest`.

### Task 2: Frontend (`investments`)
- `InstrumentApi.search(q): Observable<Instrument[]>`; `transaction-form.ts` "Yeni varlık" bölümüne `mat-autocomplete` (300 ms, ≥ 2 karakter), seçim `newType/newSymbol/newName` doldurur.
- Testler: `instrument-api.spec.ts`, `transaction-form.spec.ts` ek senaryolar.

### Task 3: Canlı kontrol, commit, push
