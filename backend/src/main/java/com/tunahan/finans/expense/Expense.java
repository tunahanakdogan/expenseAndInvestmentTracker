package com.tunahan.finans.expense;

import com.tunahan.finans.account.Account;
import com.tunahan.finans.category.Category;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/** Bir harcama ve ödemeleri (peşin = tek ödeme, N taksit = N ödeme). */
@Entity
@Table(name = "expense")
class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    private String description;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private String currency;

    @Column(name = "installment_count", nullable = false)
    private int installmentCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("installmentNo")
    private List<ExpensePayment> payments = new ArrayList<>();

    protected Expense() {
    }

    /** Para birimi hesaptan gelir. Ödemeler {@link #addPayment} ile eklenir. */
    Expense(Long userId, Account account, Category category, String description, LocalDate expenseDate,
            BigDecimal totalAmount, int installmentCount) {
        this.userId = userId;
        this.account = account;
        this.category = category;
        this.description = description;
        this.expenseDate = expenseDate;
        this.totalAmount = totalAmount;
        this.currency = account.getCurrency();
        this.installmentCount = installmentCount;
        this.createdAt = Instant.now();
    }

    void addPayment(YearMonth period, BigDecimal amount) {
        payments.add(new ExpensePayment(this, payments.size() + 1, period.toString(), amount, currency));
    }

    /** Taksitler tek tek düzenlenebilir; toplam her zaman ödemelerin toplamıdır. */
    void recalculateTotal() {
        totalAmount = payments.stream().map(ExpensePayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    Long getId() {
        return id;
    }

    Account getAccount() {
        return account;
    }

    Category getCategory() {
        return category;
    }

    String getDescription() {
        return description;
    }

    LocalDate getExpenseDate() {
        return expenseDate;
    }

    BigDecimal getTotalAmount() {
        return totalAmount;
    }

    String getCurrency() {
        return currency;
    }

    int getInstallmentCount() {
        return installmentCount;
    }

    List<ExpensePayment> getPayments() {
        return payments;
    }
}
