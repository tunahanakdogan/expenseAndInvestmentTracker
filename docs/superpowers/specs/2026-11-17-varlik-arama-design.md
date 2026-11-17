# Varlık arama (yazdıkça öneri) — kısa tasarım

## Amaç
Yeni varlık eklerken sembol ve adı elle yazmak yerine adını/kodunu yazıp listeden seçmek ("türk hava" → THYAO). Yazım hatası ve "doğru sembol neydi?" derdi biter.

## Yaklaşımlar
- **Canlı arama — seçilen.** Hisseler Yahoo arama ucundan, fonlar günde bir çekilip bellekte tutulan TEFAS listesinden, döviz eldeki TCMB kurlarından. Yeni tablo yok.
- Yerel katalog (gece doldurulan tablo) — reddedildi: yeni tablo + zamanlanmış iş + binlerce ABD satırı; bu ihtiyaç için ağır.

## Tasarım
**Backend** (`pricing` modülü — piyasa verisi):
- `GET /api/pricing/instruments?q=...` → `[{type, symbol, name, exchange}]`, en çok 20 sonuç. `q` kırpılır; 2 karakterden kısa → `[]`.
- Hisseler: `https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=10&newsCount=0`. `quoteType` `EQUITY` veya `ETF` olanlar:
  - `exchange == "IST"` → `BIST_STOCK`, sembolden `.IS` atılır (THYAO.IS → THYAO).
  - ABD borsaları (`NMS`, `NGM`, `NCM`, `NYQ`, `ASE`, `PCX`, `BTS`) → `US_STOCK`.
  - Diğer borsalar elenir. Ad: `longname`, yoksa `shortname`.
- Fonlar: TEFAS `POST /api/funds/fonGnlBlgSiraliGetir` (son 7 gün, `fonTipi=YAT`, `bitSira=5000`), sonuç kod → ad haritası olarak 24 saat bellekte; eşleşme kod önekiyle ya da adın içinde geçmesiyle.
- Döviz: kur tablosundaki para birimleri; ad `Currency.getDisplayName(tr)` ("ABD Doları"). Altın: `GRAM` / "Gram altın" ("altın", "gram", "gold" ile).
- Eşleştirme Türkçe duyarsız: küçük harf (tr-TR) + aksan atma, ı→i ("ata portfoy" ↔ "ATA PORTFÖY").
- Sıra: kodu birebir eşleşenler önce, sonra hisse, fon, döviz, altın. Önceden eklenmiş varlıklar da listede kalır (işaretlenmez; mevcut "zaten var" 422 kuralı geçerli).
- Bir kaynak hata verirse (Yahoo/TEFAS) diğerlerinin sonuçları yine döner; zaman aşımı mevcut `pricingRestClient` ile (5 sn / 10 sn).

**Frontend** (`investments/transaction-form.ts`, "Yeni varlık…" bölümü):
- En üstte arama kutusu (Material autocomplete, 300 ms gecikmeli istek). Satır: **ad** · sembol · tür etiketi (BIST / ABD / Fon / Döviz / Altın).
- Seçim tür, sembol ve ad alanlarını doldurur; alanlar düzenlenebilir kalır. Arama sonuç vermezse/kaynak çökükse elle giriş aynen çalışır.
- Servis: `InstrumentApi.search(q)`.

## Testler
- Backend: Yahoo eşleme (IST → BIST `.IS`'siz, NMS → ABD, diğer borsa elenir, ETF dahil), TEFAS listesi önbelleği (ikinci aramada istek yok), Türkçe duyarsız eşleşme, kısa `q` → `[]`, bir kaynak hata verince diğerleri döner. Gerçek uç çağrılmaz.
- Frontend: yazınca 300 ms sonra tek istek, seçim alanları doldurur, 2 karakterden kısada istek yok, hata durumunda elle giriş çalışır.

## Kapsam dışı
Var olan varlığı arama ile değiştirme; ABD için Finnhub araması (anahtar gerektirir).
