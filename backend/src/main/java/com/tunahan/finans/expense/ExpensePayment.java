package com.tunahan.finans.expense;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/** Bir harcamanın bir aya (dönem, "YYYY-MM") düşen ödemesi. Aylık liste bunlara göre hesaplanır. */
@Entity
@Table(name = "expense_payment")
class ExpensePayment {

    /** İptal/iade ilk sürümde yok; model engel olmasın diye durum alanı var. */
    static final String ACTIVE = "ACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @Column(name = "installment_no", nullable = false)
    private int installmentNo;

    @Column(nullable = false)
    private String period;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String status;

    protected ExpensePayment() {
    }

    ExpensePayment(Expense expense, int installmentNo, String period, BigDecimal amount, String currency) {
        this.expense = expense;
        this.installmentNo = installmentNo;
        this.period = period;
        this.amount = amount;
        this.currency = currency;
        this.status = ACTIVE;
    }

    void changeAmount(BigDecimal amount) {
        this.amount = amount;
    }

    Expense getExpense() {
        return expense;
    }

    int getInstallmentNo() {
        return installmentNo;
    }

    String getPeriod() {
        return period;
    }

    BigDecimal getAmount() {
        return amount;
    }

    String getCurrency() {
        return currency;
    }

    String getStatus() {
        return status;
    }
}
