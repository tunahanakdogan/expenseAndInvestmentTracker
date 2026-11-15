package com.tunahan.finans.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface ExpenseRepository extends JpaRepository<Expense, Long> {

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    boolean existsByAccountId(Long accountId);

    boolean existsByCategoryId(Long categoryId);
}
