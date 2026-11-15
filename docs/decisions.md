# Kararlar

Durum: **ALINDI** = uygula. **AÇIK** = bu konuya dokunan kod yazmadan önce Tunahan'a sor.

## D-001 — Kredi kartı taksitlerinin ilk ayı · ALINDI
**(b) Ekstre ayı.** Kredi kartı hesabında `statementDay` (1–31) zorunlu. Kural: `docs/domain.md` → "Dönem kuralı".
Reddedilen: (a) alışverişin yapıldığı ay — rapor, paranın gerçekten çıktığı ayla uyuşmaz.

## D-002 — ABD hisse fiyat kaynağı · ALINDI
**Finnhub** (`/api/v1/quote`, anahtar `US_STOCK_API_KEY`). Ücretsiz katman günde birkaç çekim için yeterli.
Reddedilen: Twelve Data (dakikada 8 istek), Alpha Vantage (günde ~25 istek).

## D-006 — Hesap para birimleri · ALINDI
Hesaplar `TRY`, `USD` veya `EUR`. Aylık harcama toplamları para birimi başına ayrı; TL'ye çevrilmiş tek toplam raporlarda.

## D-007 — Birim fiyat ve kur hassasiyeti · ALINDI
Birim fiyat ve kur `NUMBER(19,8)` (fon fiyatları 6 hane); tutarlar (harcama, maliyet, komisyon) `NUMBER(19,4)`.

## D-008 — Döviz varlığı · ALINDI
Adet kendi biriminde (ör. 1.000 USD), birim fiyat TL; güncel değer = adet × TCMB kuru.

## D-003 — Tek kullanıcı · ALINDI
İlk sürüm tek kullanıcılı. Yine de tablolarda `user_id` bulunur; JWT ile giriş yapılır.

## D-004 — Mobil = responsive + PWA · ALINDI
Ayrı mobil uygulama yok. İleride gerekirse aynı REST API kullanılır.

## D-005 — Monorepo, GitHub · ALINDI
`backend/` ve `frontend/` tek repoda. `main` korumalı, PR ile birleştirme.
