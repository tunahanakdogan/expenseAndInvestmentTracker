# Backend kuralları

## Paket yapısı (modüler monolit)
Özelliğe göre paketle, katmana göre değil:
```
com.tunahan.finans
├── auth/         # giriş, JWT
├── account/      # hesaplar (nakit, banka, kredi kartı)
├── category/     # harcama kategorileri
├── expense/      # harcamalar ve taksit ödemeleri
├── investment/   # varlıklar, yatırım işlemleri, portföy hesabı
├── pricing/      # fiyat ve kur çekme, zamanlanmış işler
├── report/       # aylık özetler
└── common/       # Money, hata yönetimi, ortak config
```
Bir modül başka modülün repository'sine doğrudan erişmez; servisini kullanır.
Modül paketi ancak o modülün ilk özelliği yazılırken oluşturulur; boş paket açma.

## Katmanlar
- Controller ince: doğrulama + servis çağrısı + DTO dönüşü. İş mantığı serviste.
- Entity'ler API'den dışarı çıkmaz; request/response için `record` DTO kullan.
- Tek uygulaması olan servis için interface yazma (`ExpenseService` sınıfı yeterli, `ExpenseServiceImpl` yok).
- Doğrulama: `jakarta.validation` anotasyonları.
- Hatalar: tek bir `@RestControllerAdvice`, `ProblemDetail` formatında döner.

## Veritabanı
- Migration'lar: `src/main/resources/db/migration/V<n>__<aciklama>.sql`. Uygulanmış migration değiştirilmez; yenisi yazılır.
- `spring.jpa.hibernate.ddl-auto=validate`. Hibernate şema üretmez.
- ID'ler: `NUMBER` + identity column.
- Para kolonları `NUMBER(19,4)`, adet kolonları `NUMBER(19,8)` (fon payı ve kesirli ABD hissesi için).
- Rapor gibi toplu sorgular için native SQL veya PL/SQL kabul; önce JPQL yetiyor mu bak.

## Fiyat sağlayıcılar
- Her kaynak `PriceProvider` arayüzünün bir uygulaması (TCMB, Yahoo, TEFAS…). Birden fazla kaynak olduğu için bu arayüz gerçekten gerekli; Ponytail bunu kaldırmasın.
- Dış çağrılar zaman aşımlı (`RestClient`). Hata olursa iş durmaz, loglanır, son bilinen fiyat kullanılır.
- Testlerde dış servis çağrılmaz; sağlayıcılar mock'lanır.

## Test
- JUnit 5 + AssertJ. Para, taksit bölme ve ortalama maliyet hesapları için birim testi zorunlu.
- Repository/entegrasyon testleri Testcontainers ile Oracle Free üzerinde.
- Komut: `./mvnw test`
