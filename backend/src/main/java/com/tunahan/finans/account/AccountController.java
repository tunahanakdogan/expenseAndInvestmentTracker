package com.tunahan.finans.account;

import com.tunahan.finans.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
class AccountController {

    private final AccountService accounts;

    AccountController(AccountService accounts) {
        this.accounts = accounts;
    }

    @GetMapping
    List<AccountResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return accounts.list(CurrentUser.id(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AccountResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AccountRequest request) {
        return accounts.create(CurrentUser.id(jwt), request);
    }

    @PutMapping("/{id}")
    AccountResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                           @Valid @RequestBody AccountRequest request) {
        return accounts.update(CurrentUser.id(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        accounts.delete(CurrentUser.id(jwt), id);
    }
}

record AccountRequest(@NotBlank @Size(max = 60) String name,
                      @NotNull AccountType type,
                      @NotNull @Pattern(regexp = "TRY|USD|EUR") String currency,
                      @Min(1) @Max(31) Integer statementDay) {
}

record AccountResponse(Long id, String name, AccountType type, String currency, Integer statementDay) {

    static AccountResponse from(Account account) {
        return new AccountResponse(account.getId(), account.getName(), account.getType(), account.getCurrency(),
                account.getStatementDay());
    }
}
