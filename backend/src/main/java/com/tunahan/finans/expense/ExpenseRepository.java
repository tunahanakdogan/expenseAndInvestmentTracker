package com.tunahan.finans.expense;

import org.springframework.data.jpa.repository.JpaRepository;

interface ExpenseRepository extends JpaRepository<Expense, Long> {

    boolean existsByAccountId(Long accountId);

    boolean existsByCategoryId(Long categoryId);
}
