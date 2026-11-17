package com.tunahan.finans.pricing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    Optional<ExchangeRate> findFirstByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(String currency, LocalDate date);

    Optional<ExchangeRate> findFirstByCurrencyOrderByRateDateDesc(String currency);

    Optional<ExchangeRate> findByCurrencyAndRateDate(String currency, LocalDate rateDate);

    @Query("select distinct e.currency from ExchangeRate e")
    List<String> findDistinctCurrencies();

    boolean existsByRateDate(LocalDate rateDate);
}
