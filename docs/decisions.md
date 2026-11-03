# Kararlar

Durum: **ALINDI** = uygula. **AÇIK** = bu konuya dokunan kod yazmadan önce Tunahan'a sor.

## D-001 — Kredi kartı taksitlerinin ilk ayı · AÇIK
Seçenekler:
- (a) Alışverişin yapıldığı ay
- (b) Kartın hesap kesim gününe göre ekstrenin geldiği ay (hesaba `statementDay` alanı gerekir)

## D-002 — ABD hisse fiyat kaynağı · AÇIK
Finnhub, Twelve Data veya Alpha Vantage. Ücretsiz katman limitlerine göre seçilecek.

## D-003 — Tek kullanıcı · ALINDI
İlk sürüm tek kullanıcılı. Yine de tablolarda `user_id` bulunur; JWT ile giriş yapılır.

## D-004 — Mobil = responsive + PWA · ALINDI
Ayrı mobil uygulama yok. İleride gerekirse aynı REST API kullanılır.

## D-005 — Monorepo, GitHub · ALINDI
`backend/` ve `frontend/` tek repoda. `main` korumalı, PR ile birleştirme.
