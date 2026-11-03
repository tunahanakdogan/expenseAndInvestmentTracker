# Mimari

```
[ Angular (responsive + PWA) ]   ← tarayıcı / telefon
            │  REST (JSON) + JWT
[ Spring Boot — modüler monolit ]
   auth · account · category · expense · investment · pricing · report
            │
[ Oracle DB ]        [ Dış kaynaklar: TCMB, Yahoo Finance, TEFAS, ABD hisse API'si ]
```

## Bileşenler
| Katman | Seçim | Neden |
|---|---|---|
| Frontend | Angular + Angular Material, PWA | Tek kod tabanı hem web hem mobil |
| Backend | Java + Spring Boot | Java bilgisini derinleştirmek, tek backend |
| Veritabanı | Oracle | İşteki PL/SQL bilgisi; Oracle Cloud ücretsiz katmanı |
| Migration | Flyway | Şema sürüm kontrolünde |
| Barındırma | Oracle Cloud Always Free (VM + Autonomous DB) | Ücretsiz/ucuz |
| CI | GitHub Actions | Repo GitHub'da |

## Fiyat kaynakları
| Varlık | Kaynak | Sıklık |
|---|---|---|
| Döviz | TCMB günlük kurları | Günde 1 |
| BIST hisseleri | Yahoo Finance (`THYAO.IS`) — resmi değil, gecikmeli | Gün içinde birkaç kez |
| ABD hisseleri | Finnhub / Twelve Data / Alpha Vantage (biri seçilecek) | Gün içinde birkaç kez |
| Altın | Ons × USD/TRY ÷ 31,1035 → gram altın | Gün içinde birkaç kez |
| Yatırım fonları | TEFAS — resmi API yok | Günde 1 |

Her kaynak `PriceProvider` uygulamasıdır; kaynak değişirse yalnızca o sınıf değişir.

## Lokal geliştirme
`docker compose up -d` ile Oracle Free ayağa kalkar. Backend ve frontend lokalde çalışır.
