# Frontend kuralları

## Yapı
- Angular, standalone component'ler, state için signals. NgModule yok.
- Klasörler özelliğe göre: `src/app/expenses/`, `src/app/investments/`, `src/app/reports/`, ortak parçalar `src/app/shared/`.
- Her özellik lazy-loaded route.
- Backend çağrıları özellik başına bir servis (`ExpenseApi` gibi), `HttpClient` ile. JWT bir interceptor ile eklenir.

## Arayüz
- Angular Material. Ayrı bir UI kütüphanesi ekleme.
- **Önce mobil:** her ekran önce ~380px genişlikte tasarlanır, sonra masaüstüne genişler.
- Harcama girişi mobilde tek elle, en fazla birkaç dokunuşla yapılabilmeli (tutar, kategori, kaydet).
- Tüm metinler Türkçe. Tutarlar `tr-TR` biçiminde (`1.234,56 ₺`), tarihler `gg.aa.yyyy`.
- Grafikler: ngx-charts.

## Para
- Tutarlar API'den string olarak gelir ve string olarak gider (`"1234.5600"`). Frontend'de tutarlarla aritmetik yapma; hesap backend'de.
- Gösterim için tek bir `money` pipe'ı kullan.

## PWA
- `@angular/pwa` ile eklenir. Uygulama adı "Finans Takip".
- Çevrimdışı veri girişi ilk sürümde yok.

## Test
- Komut: `npm test`. Form doğrulamaları ve tutar biçimlendirmesi test edilir.
