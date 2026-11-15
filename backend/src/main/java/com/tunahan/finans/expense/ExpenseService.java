package com.tunahan.finans.expense;

import com.tunahan.finans.account.Account;
import com.tunahan.finans.account.AccountService;
import com.tunahan.finans.account.AccountType;
import com.tunahan.finans.category.Category;
import com.tunahan.finans.category.CategoryService;
import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

@Service
class ExpenseService {

    /** API'ye dönen tutarların ölçeği (DB kolonu NUMBER(19,4)). */
    private static final int AMOUNT_SCALE = 4;

    private final ExpenseRepository expenses;
    private final AccountService accounts;
    private final CategoryService categories;

    ExpenseService(ExpenseRepository expenses, AccountService accounts, CategoryService categories) {
        this.expenses = expenses;
        this.accounts = accounts;
        this.categories = categories;
    }

    @Transactional
    ExpenseResponse create(Long userId, ExpenseRequest request) {
        Account account = accounts.get(userId, request.accountId());
        Category category = categories.get(userId, request.categoryId());
        int count = request.installmentCount();
        if (count > 1 && account.getType() != AccountType.CREDIT_CARD) {
            throw new BusinessRuleException("Taksit yalnız kredi kartında yapılabilir");
        }
        List<BigDecimal> amounts = PaymentPlan.split(request.amount(), count);
        List<YearMonth> periods = PaymentPlan.periods(request.date(), account.getStatementDay(), count);

        String description = request.description() == null || request.description().isBlank()
                ? null : request.description().strip();
        Expense expense = new Expense(userId, account, category, description, request.date(), request.amount(), count);
        for (int i = 0; i < count; i++) {
            expense.addPayment(periods.get(i), amounts.get(i));
        }
        return toResponse(expenses.save(expense));
    }

    @Transactional(readOnly = true)
    ExpenseResponse get(Long userId, Long id) {
        return toResponse(find(userId, id));
    }

    @Transactional
    void delete(Long userId, Long id) {
        expenses.delete(find(userId, id));
    }

    /** Başka kullanıcının harcaması da "bulunamadı" sayılır. */
    private Expense find(Long userId, Long id) {
        return expenses.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Harcama bulunamadı"));
    }

    private static ExpenseResponse toResponse(Expense expense) {
        List<PaymentResponse> payments = expense.getPayments().stream()
                .map(p -> new PaymentResponse(p.getInstallmentNo(), p.getPeriod(), scaled(p.getAmount()), p.getStatus()))
                .toList();
        return new ExpenseResponse(expense.getId(),
                expense.getAccount().getId(), expense.getAccount().getName(),
                expense.getCategory().getId(), expense.getCategory().getName(),
                expense.getDescription(), expense.getExpenseDate(), scaled(expense.getTotalAmount()),
                expense.getCurrency(), expense.getInstallmentCount(), payments);
    }

    /** İstek tutarları en çok 2, kolonlar 4 hane olduğu için yuvarlama gerekmez; yalnız sıfırla doldurur. */
    private static BigDecimal scaled(BigDecimal amount) {
        return amount.setScale(AMOUNT_SCALE);
    }
}
