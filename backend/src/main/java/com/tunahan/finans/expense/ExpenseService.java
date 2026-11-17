package com.tunahan.finans.expense;

import com.tunahan.finans.account.Account;
import com.tunahan.finans.account.AccountService;
import com.tunahan.finans.account.AccountType;
import com.tunahan.finans.category.Category;
import com.tunahan.finans.category.CategoryService;
import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.Money;
import com.tunahan.finans.common.NotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

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
        try {
            expenses.saveAndFlush(expense);
        } catch (DataIntegrityViolationException e) {
            throw deletedMeanwhile(e);
        }
        return toResponse(expense);
    }

    @Transactional(readOnly = true)
    ExpenseResponse get(Long userId, Long id) {
        return toResponse(find(userId, id));
    }

    @Transactional(readOnly = true)
    PeriodPaymentsResponse listByPeriod(Long userId, YearMonth period) {
        List<ExpensePayment> payments = expenses.findPaymentsByPeriod(userId, period.toString());

        Map<String, Money> totals = new TreeMap<>();
        Map<List<Object>, Money> byCategory = new LinkedHashMap<>();
        Map<Long, String> categoryNames = new HashMap<>();
        for (ExpensePayment payment : payments) {
            Money amount = new Money(payment.getAmount(), payment.getCurrency());
            totals.merge(payment.getCurrency(), amount, Money::add);
            Category category = payment.getExpense().getCategory();
            categoryNames.put(category.getId(), category.getName());
            byCategory.merge(List.of(payment.getCurrency(), category.getId()), amount, Money::add);
        }
        List<CategoryTotal> categoryTotals = byCategory.entrySet().stream()
                .map(e -> {
                    Long categoryId = (Long) e.getKey().get(1);
                    Money amount = e.getValue();
                    BigDecimal share = amount.amount().multiply(BigDecimal.valueOf(100))
                            .divide(totals.get(amount.currency()).amount(), 2, Money.ROUNDING);
                    return new CategoryTotal(categoryId, categoryNames.get(categoryId), amount.currency(),
                            scaled(amount.amount()), share);
                })
                .sorted(Comparator.comparing(CategoryTotal::currency)
                        .thenComparing(CategoryTotal::amount, Comparator.reverseOrder())
                        .thenComparing(CategoryTotal::name))
                .toList();
        return new PeriodPaymentsResponse(period.toString(),
                payments.stream().map(ExpenseService::toRow).toList(),
                totals.values().stream().map(t -> new CurrencyTotal(t.currency(), scaled(t.amount()))).toList(),
                categoryTotals);
    }

    /** Tek taksitin tutarını değiştirir; harcama toplamı ödemelerin toplamı olarak yeniden hesaplanır. */
    @Transactional
    ExpenseResponse updatePayment(Long userId, Long expenseId, int installmentNo, BigDecimal amount) {
        Expense expense = find(userId, expenseId);
        ExpensePayment payment = expense.getPayments().stream()
                .filter(p -> p.getInstallmentNo() == installmentNo)
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Taksit bulunamadı"));
        payment.changeAmount(amount);
        expense.recalculateTotal();
        return toResponse(expense);
    }

    @Transactional
    void delete(Long userId, Long id) {
        expenses.delete(find(userId, id));
    }

    /**
     * Hesap ya da kategori, yukarıda bulunduktan sonra başka bir istekle silinmişse FK ihlali olur;
     * kayıt artık yoktur, yanıt 404'tür. Başka bir ihlal ise olduğu gibi bırakılır.
     */
    private static RuntimeException deletedMeanwhile(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage()).toUpperCase(Locale.ROOT);
        if (cause.contains("FK_EXPENSE_ACCOUNT")) {
            return new NotFoundException("Hesap bulunamadı");
        }
        if (cause.contains("FK_EXPENSE_CATEGORY")) {
            return new NotFoundException("Kategori bulunamadı");
        }
        return e;
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

    private static PaymentRow toRow(ExpensePayment payment) {
        Expense expense = payment.getExpense();
        return new PaymentRow(expense.getId(), payment.getInstallmentNo(), expense.getInstallmentCount(),
                scaled(payment.getAmount()), payment.getCurrency(), expense.getExpenseDate(),
                expense.getDescription(), expense.getCategory().getName(), expense.getAccount().getName());
    }

    /** İstek tutarları en çok 2, kolonlar 4 hane olduğu için yuvarlama gerekmez; yalnız sıfırla doldurur. */
    private static BigDecimal scaled(BigDecimal amount) {
        return amount.setScale(AMOUNT_SCALE);
    }
}
