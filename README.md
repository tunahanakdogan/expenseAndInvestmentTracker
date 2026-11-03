# Finans Takip

Kişisel harcama (taksitli dahil) ve yatırım (BIST, ABD hisseleri, döviz, altın, fonlar) takip uygulaması.
Angular + Spring Boot + Oracle. Web'de ve telefonda (PWA) çalışır.

## Gereksinimler
- Java 25 (JDK), Node.js LTS, Docker Desktop

## Başlangıç
```bash
cp .env.example .env      # değerleri doldur (JWT_SECRET en az 32 karakter)
docker compose up -d      # lokal Oracle (ilk açılış birkaç dakika sürer)
cd backend && ./mvnw spring-boot:run   # http://localhost:8080 — .env'i kök dizinden okur
cd frontend && npm install && npm start  # http://localhost:4200 — /api isteklerini 8080'e yönlendirir
```
İlk açılışta veritabanında kullanıcı yoksa backend, `.env`'deki `APP_USERNAME` / `APP_PASSWORD` ile kullanıcıyı oluşturur.

## Testler
```bash
cd backend && ./mvnw test    # Testcontainers ile Oracle Free'de çalışır, Docker açık olmalı
cd frontend && npm test
```

## Dokümanlar
- `docs/architecture.md` — mimari ve fiyat kaynakları
- `docs/domain.md` — taksit, portföy ve para kuralları
- `docs/decisions.md` — alınmış ve açık kararlar
