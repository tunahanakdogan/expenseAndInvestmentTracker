package com.tunahan.finans.investment;

import com.tunahan.finans.common.CurrentUser;
import com.tunahan.finans.common.Money;
import com.tunahan.finans.investment.InvestmentTransactionService.NewTransaction;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/investments/transactions")
class InvestmentTransactionController {

    private final InvestmentTransactionService transactions;

    InvestmentTransactionController(InvestmentTransactionService transactions) {
        this.transactions = transactions;
    }

    @GetMapping
    List<TransactionResponse> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) Long assetId) {
        return transactions.list(CurrentUser.id(jwt), assetId).stream().map(TransactionResponse::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    TransactionResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateTransactionRequest r) {
        return TransactionResponse.of(transactions.add(CurrentUser.id(jwt), new NewTransaction(
                r.assetId(), r.type(), r.tradeDate(), r.quantity(), r.unitPrice(), r.commission(), r.fxRateTry())));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        transactions.delete(CurrentUser.id(jwt), id);
    }

    record CreateTransactionRequest(
            @NotNull Long assetId,
            @NotNull TransactionType type,
            @NotNull LocalDate tradeDate,
            @NotNull @Positive @Digits(integer = 11, fraction = 8) BigDecimal quantity,
            @NotNull @Positive @Digits(integer = 11, fraction = 8) BigDecimal unitPrice,
            @PositiveOrZero @Digits(integer = 15, fraction = 4) BigDecimal commission,
            @Positive @Digits(integer = 11, fraction = 8) BigDecimal fxRateTry) {
    }

    /** Ölçekler açıkça verilir: Oracle NUMBER'ı sondaki sıfırlar olmadan döndürür. */
    record TransactionResponse(Long id, Long assetId, TransactionType type, LocalDate tradeDate, BigDecimal quantity,
                               BigDecimal unitPrice, BigDecimal commission, String currency, BigDecimal fxRateTry) {

        static TransactionResponse of(InvestmentTransaction t) {
            return new TransactionResponse(t.getId(), t.getAssetId(), t.getType(), t.getTradeDate(),
                    t.getQuantity().setScale(8, Money.ROUNDING), t.getUnitPrice().setScale(8, Money.ROUNDING),
                    t.getCommission().setScale(4, Money.ROUNDING), t.getCurrency(),
                    t.getFxRateTry() == null ? null : t.getFxRateTry().setScale(8, Money.ROUNDING));
        }
    }
}
