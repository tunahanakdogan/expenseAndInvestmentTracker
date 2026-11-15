package com.tunahan.finans.expense;

import com.tunahan.finans.account.AccountUsage;
import com.tunahan.finans.category.CategoryUsage;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Hesap ve kategori modüllerine "harcaması var mı" bilgisini verir (silme ve düzenleme kuralları için).
 * Yalnız repository'ye bağlıdır; ExpenseService → AccountService → AccountUsage zinciri döngü oluşturmaz.
 */
@Configuration
class ExpenseUsage {

    @Bean
    AccountUsage accountUsage(ExpenseRepository expenses) {
        return expenses::existsByAccountId;
    }

    @Bean
    CategoryUsage categoryUsage(ExpenseRepository expenses) {
        return expenses::existsByCategoryId;
    }
}
