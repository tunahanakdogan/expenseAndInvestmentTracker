package com.tunahan.finans.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

interface ExpenseRepository extends JpaRepository<Expense, Long> {

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    /** Bir dönemin ödemeleri; harcama tarihi (eşitse en son girilen) önce. */
    @Query("""
            select p from ExpensePayment p
            join fetch p.expense e
            join fetch e.account
            join fetch e.category
            where e.userId = :userId and p.period = :period
            order by e.expenseDate desc, e.id desc
            """)
    List<ExpensePayment> findPaymentsByPeriod(Long userId, String period);

    boolean existsByAccountId(Long accountId);

    boolean existsByCategoryId(Long categoryId);
}
