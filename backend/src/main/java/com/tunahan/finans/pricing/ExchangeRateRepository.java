package com.tunahan.finans.pricing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    Optional<ExchangeRate> findFirstByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(String currency, LocalDate date);

    Optional<ExchangeRate> findFirstByCurrencyOrderByRateDateDesc(String currency);

    Optional<ExchangeRate> findByCurrencyAndRateDate(String currency, LocalDate rateDate);
}
