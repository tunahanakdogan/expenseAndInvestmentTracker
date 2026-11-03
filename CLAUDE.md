# Finans Takip

Kişisel harcama ve yatırım takip uygulaması. Tek kullanıcı (Tunahan) için, web'de çalışır, mobilde responsive + PWA olarak kullanılır.

## Yığın
- **Backend:** Java 25, Spring Boot (REST, Spring Data JPA, Spring Security + JWT), Maven → `backend/`
- **Frontend:** Angular (standalone components, signals), Angular Material, PWA → `frontend/`
- **Veritabanı:** Oracle (lokalde Docker'da Oracle Free, prod'da Oracle Cloud Always Free Autonomous DB). Şema değişiklikleri **yalnızca Flyway migration** ile.
- **Repo:** GitHub monorepo. CI: GitHub Actions.

Ayrıntılar: `docs/architecture.md`, domain kuralları: `docs/domain.md`, alınmış ve açık kararlar: `docs/decisions.md`.
Alt klasörlerdeki `backend/CLAUDE.md` ve `frontend/CLAUDE.md` o klasöre özel kuralları içerir.

## Çalışma şekli
- Her iş ayrı branch'te: `feature/<kisa-ad>`, `fix/<kisa-ad>`. `main`'e doğrudan commit yok; küçük PR'larla birleştir.
- Commit mesajları Türkçe, kısa ve emir kipinde: `Taksitli harcama girişi ekle`.
- Bir özelliği bitirmeden önce testleri çalıştır ve geçtiğini gör. Geçmeyen testle "bitti" deme.
- `docs/decisions.md`'de **açık** olarak işaretli bir konuya dokunan kod yazmadan önce bana sor.
- Yeni bir kütüphane eklemeden önce sor.

## Ponytail
Bu projede Ponytail plugin'i aktif (`.claude/settings.json`). Varsayılan mod `full`.
- Kod yazarken Ponytail kurallarına uy: ihtiyaç olmayanı yazma, tek kullanımlık soyutlama kurma, spekülatif genelleştirme yapma.
- PR açmadan önce değişikliği `/ponytail-review` ile gözden geçir.
- Bilerek ertelediğin kısayolları `/ponytail-debt` ile kayda geçir.
- **Ponytail'in sadeleştiremeyeceği şeyler** (bunlar "fazlalık" değil, gereklilik):
  - Para hesaplarında `BigDecimal` ve açık yuvarlama kuralı
  - Para, taksit ve maliyet hesaplarının birim testleri
  - Kimlik doğrulama ve yetki kontrolleri
  - Flyway migration'ları
  - `docs/domain.md`'deki kurallar

## Kesin kurallar
- Para: Java'da `BigDecimal`, DB'de `NUMBER(19,4)`. `double`/`float` asla. Yuvarlama `RoundingMode.HALF_EVEN`, gösterimde 2 hane.
- Her tutar yanında para birimi (`TRY`, `USD`, `EUR`…) saklanır.
- Tarihler: işlem tarihi `LocalDate`, zaman damgası `Instant` (UTC). Kullanıcı saat dilimi `Europe/Istanbul`.
- Kod (sınıf, tablo, kolon, değişken) **İngilizce**; arayüz metinleri **Türkçe**. Terim karşılıkları `docs/domain.md`'deki sözlükte.
- Sır (API anahtarı, DB şifresi, JWT secret) repoya girmez; ortam değişkeninden okunur.

## Komutlar
```bash
docker compose up -d                 # lokal Oracle
cd backend && ./mvnw spring-boot:run # backend
cd backend && ./mvnw test            # backend testleri
cd frontend && npm start             # frontend (http://localhost:4200)
cd frontend && npm test -- --watch=false  # frontend testleri (Vitest)
cd frontend && npm run build         # frontend prod build
```
- Backend testleri Testcontainers kullanır; Docker açık olmalı.
- Backend lokalde kök dizindeki `.env`'i okur (`spring.config.import`); frontend `/api` isteklerini `proxy.conf.json` ile 8080'e yönlendirir.
