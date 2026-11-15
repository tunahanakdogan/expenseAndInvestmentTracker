package com.tunahan.finans.expense;

import com.tunahan.finans.account.Account;
import com.tunahan.finans.account.AccountService;
import com.tunahan.finans.account.AccountType;
import com.tunahan.finans.category.Category;
import com.tunahan.finans.category.CategoryService;
import com.tunahan.finans.common.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Hesap ya da kategori, bulunduktan sonra ama harcama yazılmadan önce silinirse FK ihlali 404'e çevrilir. */
class ExpenseServiceTest {

    private static final ExpenseRequest REQUEST =
            new ExpenseRequest(2L, 3L, new BigDecimal("10.00"), LocalDate.of(2026, 11, 10), 1, null);

    private final ExpenseRepository expenses = mock(ExpenseRepository.class);
    private final AccountService accounts = mock(AccountService.class);
    private final CategoryService categories = mock(CategoryService.class);
    private final ExpenseService service = new ExpenseService(expenses, accounts, categories);

    @BeforeEach
    void setUp() {
        Account account = mock(Account.class);
        when(account.getType()).thenReturn(AccountType.CASH);
        when(account.getCurrency()).thenReturn("TRY");
        when(accounts.get(1L, 2L)).thenReturn(account);
        when(categories.get(1L, 3L)).thenReturn(mock(Category.class));
    }

    @Test
    void createMapsAccountForeignKeyViolationToNotFound() {
        when(expenses.saveAndFlush(any())).thenThrow(fkViolation("FK_EXPENSE_ACCOUNT"));

        assertThatThrownBy(() -> service.create(1L, REQUEST))
                .isInstanceOf(NotFoundException.class).hasMessage("Hesap bulunamadı");
    }

    @Test
    void createMapsCategoryForeignKeyViolationToNotFound() {
        when(expenses.saveAndFlush(any())).thenThrow(fkViolation("FK_EXPENSE_CATEGORY"));

        assertThatThrownBy(() -> service.create(1L, REQUEST))
                .isInstanceOf(NotFoundException.class).hasMessage("Kategori bulunamadı");
    }

    @Test
    void createDoesNotHideOtherIntegrityViolations() {
        DataIntegrityViolationException other = fkViolation("UQ_EXPENSE_PAYMENT_NO");
        when(expenses.saveAndFlush(any())).thenThrow(other);

        assertThatThrownBy(() -> service.create(1L, REQUEST)).isSameAs(other);
    }

    private static DataIntegrityViolationException fkViolation(String constraint) {
        return new DataIntegrityViolationException("could not execute statement", new java.sql.SQLException(
                "ORA-02291: integrity constraint (TEST." + constraint + ") violated - parent key not found"));
    }
}
