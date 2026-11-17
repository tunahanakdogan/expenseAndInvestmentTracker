# Arayüz yenileme: "B · Gece" — tasarım

Görsel referans: tasarım tuvali https://claude.ai/artifact/BWVLBm4rP3XjvnepHN4xoj (B satırı + "seçilen yön: diğer ekranlar").

## Amaç
Varsayılan Material görünümünden kişiliği olan, telefonda tek elle rahat kullanılan bir arayüze geçmek. Kullanıcı üç yön arasından **B · Gece**'yi seçti: koyu zemin, büyük rakamlar, fosforlu yeşil vurgu, ortada büyük + butonlu yüzen menü, tuş takımıyla tutar girişi.

## Hedef dışı
Yeni özellik (raporlar, bütçe), yeni UI kütüphanesi.

## Tema: koyu, açık ve seçim (kullanıcı isteği)
- Seçenekler **Sistem · Koyu · Açık**; varsayılan **Sistem** (`prefers-color-scheme`'i izler).
- Seçim **Ayarlar → Görünüm**'de tek bir segment kontrolüyle (iki temada da aynı bileşen); cihaz başına `localStorage`'da saklanır (okuma/yazma `try/catch`, erişilemezse Sistem).
- Uygulama: `<html data-theme="dark|light">`; tokenlar iki tema için tanımlı; Material tarafında `color-scheme: light` / `dark` aynı özniteliğe bağlı. Sayfa ilk boyamadan önce temayı uygulayan küçük satır içi betik (`index.html`) — açılışta yanıp sönme olmaz.
- `<meta name="theme-color">` seçilen temaya göre güncellenir.

## Yaklaşım
Angular Material kalır (kural); görünüm üç katmanda değişir:
1. **Tema:** `styles.scss`'te Material 3 **koyu** tema + CSS değişkenleri (aşağıdaki tokenlar); Material bileşenleri `mat.*-overrides` ve token'larla boyanır.
2. **Kabuk:** yeni alt menü / yan ray.
3. **Ekranlar:** mevcut bileşenlerin şablon ve stilleri yeniden yazılır; davranış ve API aynı kalır (tuş takımı hariç).

Reddedilen: Material'ı tamamen bırakıp sıfırdan bileşen yazmak (erişilebilirlik ve form davranışı kaybı, kural ihlali).

## Tokenlar
| Token | Koyu | Açık | Kullanım |
|---|---|---|---|
| `--app-bg` | `#0E1116` | `#F4F6F9` | sayfa zemini |
| `--app-surface` | `#171C23` | `#FFFFFF` | kart, giriş alanı, menü |
| `--app-surface-2` | `#1E242D` | `#EEF1F5` | ikon kutusu, seçili satır |
| `--app-border` | `#2A313B` | `#DDE2E8` | ince çerçeve |
| `--app-text` | `#F2F4F7` | `#0E1116` | ana metin |
| `--app-muted` | `#9AA4B2` | `#5B6573` | ikincil metin (≥ 4.5:1) |
| `--app-accent` | `#C6F432` | `#C6F432` | birincil buton dolgusu, + butonu |
| `--app-accent-ink` | `#0E1116` | `#0E1116` | vurgu dolgusu üstü metin |
| `--app-accent-text` | `#C6F432` | `#4D7C0F` | vurgu renkli **metin**: aktif sekme, getiri, bağlantı (açıkta fosforlu yeşil okunmaz) |
| `--app-accent-soft` | `#1E2410` | `#EEF8D0` | vurgu rozeti zemini |
| `--app-danger` | `#FF8A8A` | `#C62828` | hata, zarar, sil |

Yazı: **Inter** (metin) + **Space Grotesk** (tutarlar ve başlıklar); Google Fonts `<link>` ile (kütüphane değil). Köşe: kart 18 px, giriş 14 px, birincil buton 18 px. Dokunma hedefi ≥ 44 px. Açık temada kartlar ince çerçeve + hafif gölge. PWA manifest `background_color`/`theme_color` `#0E1116` (yükleme ekranı), çalışırken meta `theme-color` temaya göre.

## Ekranlar
- **Kabuk:** mobilde yüzen alt menü — Harcama · **+** · Yatırım. **+** bulunduğun bölüme göre: Harcamalar'da hızlı giriş, Yatırımlar'da işlem formu. Ayarlar sağ üstte dişli. ≥ 840 px: soldaki ray (Harcamalar, Yatırımlar, Ayarlar + "Ekle" butonu).
- **Harcamalar:** ay seçici hap (‹ Kasım 2026 ›), büyük toplam (Space Grotesk 46 px) + diğer para birimleri ve ödeme sayısı, yatay kategori kutucukları (tutar + oran çubuğu), ödeme listesi (ikon kutusu, başlık, kategori · tarih · hesap, tutar, "2/6 taksit").
- **Hızlı giriş:** tam ekran (masaüstünde ortalanmış panel). Büyük tutar göstergesi, **kendi tuş takımı** (1–9, virgül, 0, sil); fiziksel klavye de çalışır. Kategori çipleri, hesap seçimi, kredi kartında taksit, tarih, altta "ekstre: Aralık 2026" bilgisi, Kaydet. Tutar string olarak kurulur (aritmetik yok), `parseAmount` ile doğrulanır.
- **Harcama detayı:** başlık + kategori · hesap · tarih, büyük toplam, "6 taksit · ayda 750,00 ₺", taksit ilerleme şeridi (adet bazlı), taksit listesi (bu ay vurgulu, düzenle ikonu), "Harcamayı sil".
- **Yatırımlar:** büyük toplam, getiri rozeti, maliyet; **dağılım şeridi** (hisse/altın/fon/döviz yüzdeleri); varlık kartları (değer, getiri %), "Fiyatları güncelle" ikon butonu ve durum satırı.
- **Yatırım işlemi:** Alış/Satış segmenti, varlık arama (öneri listesi koyu panel), Tarih/Adet/Birim fiyat/Komisyon ızgarası, ABD hissesinde kur, Kaydet.
- **Ayarlar:** Görünüm (Sistem · Koyu · Açık), hesaplar listesi (+ Hesap ekle), kategori çipleri (+ Kategori), oturum bilgisi, Çıkış yap.
- **Giriş ekranı:** logo kutusu, "Finans Takip", iki alan, hata satırı, Giriş yap.

## Responsive düzen (kullanıcı isteği: web ve telefonda aynı rahatlıkta)
Tuvaldeki "Web (geniş ekran)" satırı referanstır. Kırılma noktaları:

| Genişlik | Düzen |
|---|---|
| < 600 px (telefon) | Bugünkü tasarım: yüzen alt menü, tam ekran giriş/detay/form, tuş takımı. |
| 600–839 px (tablet, dar pencere) | Telefon düzeni; içerik 640 px'te ortalanır, liste kartları biraz ferahlar. |
| ≥ 840 px (web) | Soldaki ray (Ekle · Harcamalar · Yatırımlar · Ayarlar); sayfa başlığı solda büyük, sağda sayfa eylemleri. İçerik en fazla 1200 px. |

Web düzeninde ekranlar:
- **Harcamalar:** iki sütun — solda 360 px özet kartı (toplam + kategori listesi: ad, tutar, %, çubuk), sağda ödemeler **tablosu** (Tarih · Açıklama · Kategori · Hesap · Taksit · Tutar); satıra tıklayınca detay.
- **Yatırımlar:** üstte 3 özet kartı (Toplam değer · Maliyet · Getiri), tam genişlikte etiketli dağılım şeridi, varlıklar **tablosu** (Varlık · Tür · Adet · Ort. maliyet · Güncel · Değer · Getiri).
- **Hızlı giriş, harcama detayı, yatırım işlemi:** tam ekran sayfa yerine karartılmış zemin üstünde ortada **panel** (480 px). Hızlı girişte **tuş takımı gizlenir**, tutar klavyeyle yazılır; hesap/taksit/tarih tek satırda; Enter kaydeder, Esc kapatır.
- **Ayarlar:** ray varken geri butonu gizlenir; içerik iki sütun (Görünüm + Hesaplar | Kategoriler).
- **Giriş ekranı:** ortada 400 px kart.
- Tablolar dar alanda kaymaz: 840–1000 px arasında bazı sütunlar (Hesap, Ort. maliyet, Güncel) gizlenir.

## Backend eklemeleri (frontend tutarla hesap yapmadığı için)
- `GET /api/expenses?period=` yanıtına `categoryTotals: [{categoryId, name, currency, amount, sharePct}]` — para birimi başına, tutara göre azalan; `sharePct` o para birimindeki toplamın yüzdesi (2 hane HALF_EVEN).
- `GET /api/portfolio` yanıtına `allocation: [{type, valueTry, sharePct}]` — yalnız TRY değeri bilinen varlıklar; türe göre gruplu, azalan.
- Testli; mevcut alanlar değişmez.

## Test ve doğrulama
- Mevcut testler yeni şablonlara uyarlanır; davranış testleri korunur. Yeni: tuş takımı (rakam ekleme, virgül tek, en çok 2 ondalık, sil), + butonunun bölüme göre davranışı, kategori/dağılım bileşenleri, backend `categoryTotals` ve `allocation`.
- Yeni: tema servisi (Sistem/Koyu/Açık, kayıt, `localStorage` hatasında Sistem), Ayarlar'daki seçici.
- Gerçek tarayıcıda 375 px ve masaüstünde, **iki temada** ekran ekran görsel kontrol (geçici test ortamıyla).

## Uygulayıcıya kalanlar
Material token eşlemesinin ayrıntısı, ikonların (Material Symbols mevcut) seçimi, boş/yükleniyor durumlarının görünümü — hepsi bu dilde.
