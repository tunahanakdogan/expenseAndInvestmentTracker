package com.tunahan.finans.expense;

import com.tunahan.finans.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
class ExpenseController {

    private final ExpenseService expenses;

    ExpenseController(ExpenseService expenses) {
        this.expenses = expenses;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ExpenseResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ExpenseRequest request) {
        return expenses.create(CurrentUser.id(jwt), request);
    }

    @GetMapping("/{id}")
    ExpenseResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return expenses.get(CurrentUser.id(jwt), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        expenses.delete(CurrentUser.id(jwt), id);
    }
}

/** {@code amount}: toplam tutar (vade farkı dahil), en çok 2 ondalık. Para birimi hesaptan gelir. */
record ExpenseRequest(@NotNull Long accountId,
                      @NotNull Long categoryId,
                      @NotNull @Positive @Digits(integer = 15, fraction = 2) BigDecimal amount,
                      @NotNull LocalDate date,
                      @NotNull @Min(1) @Max(36) Integer installmentCount,
                      @Size(max = 200) String description) {
}

/** {@code period}: "YYYY-MM". */
record PaymentResponse(int installmentNo, String period, BigDecimal amount, String status) {
}

record ExpenseResponse(Long id, Long accountId, String accountName, Long categoryId, String categoryName,
                       String description, LocalDate date, BigDecimal totalAmount, String currency,
                       int installmentCount, List<PaymentResponse> payments) {
}
