# Domain kuralları

## Sözlük (arayüz ↔ kod)
| Türkçe | Kod |
|---|---|
| Hesap | `Account` |
| Kategori | `Category` |
| Harcama | `Expense` |
| Taksit / ödeme | `ExpensePayment` |
| Varlık | `Asset` |
| Yatırım işlemi | `InvestmentTransaction` |
| Fiyat geçmişi | `PriceHistory` |
| Kur geçmişi | `ExchangeRate` |
| Bütçe | `Budget` |

## Harcamalar ve taksitler
- Her harcama (`Expense`) en az bir ödeme (`ExpensePayment`) üretir. Peşin harcama = tek ödeme.
- N taksitli harcamada backend N ödeme satırını otomatik üretir; her biri bir aya (`period`, `YearMonth`) ait.
- **Aylık raporlar ödemelere göre hesaplanır**, harcama tarihine göre değil.
- Taksit tutarı: `toplam / N`, 2 haneye `HALF_EVEN` yuvarlanır; kuruş farkı **son taksite** eklenir. Taksitlerin toplamı her zaman harcama toplamına eşittir (test ile garanti).
- Toplam tutarı kullanıcı girer (vade farkı dahil). Taksitler tek tek düzenlenebilir; düzenleme sonrası toplam yeniden hesaplanır.
- İlk taksitin hangi aya düştüğü: bkz. `decisions.md` → D-001.
- İptal/iade ve erken kapatma ilk sürümde yok, ama model engel olmamalı (ödeme satırında `status` alanı).

## Yatırımlar
- Varlık türleri: `BIST_STOCK`, `US_STOCK`, `FUND`, `CURRENCY`, `GOLD`.
- Her varlığın bir işlem para birimi vardır: `US_STOCK` → USD, diğerleri TRY (döviz varlığında kendi birimi).
- Portföy **saklanmaz, hesaplanır**: eldeki adet ve ortalama maliyet, `InvestmentTransaction` kayıtlarından türetilir.
- İşlem türleri: `BUY`, `SELL`. Sonra eklenebilir: `DIVIDEND`, `BONUS_SHARE` (bedelsiz).
- Ortalama maliyet: ağırlıklı ortalama; satış ortalama maliyeti değiştirmez, adedi azaltır. Komisyon maliyete eklenir.
- ABD hissesi işlemlerinde işlem anındaki USD/TRY kuru da saklanır; getiri hem USD hem TRY bazında gösterilir.
- Eldeki adetten fazla satış reddedilir.

## Para birimi
- Rapor para birimi TRY. Çevrim, işlem tarihindeki `ExchangeRate` ile yapılır; o güne kur yoksa önceki en yakın iş günü kuru kullanılır.
