package com.tunahan.finans.account;

import com.tunahan.finans.common.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Eşzamanlı iki istek ön kontrolü birlikte geçerse unique kısıtı devreye girer; yanıt yine 422 olmalı. */
class AccountServiceTest {

    private static final AccountRequest CASH = new AccountRequest("Cüzdan", AccountType.CASH, "TRY", null);

    private final AccountRepository accounts = mock(AccountRepository.class);
    private final AccountService service = new AccountService(accounts, accountId -> false);

    @Test
    void createMapsUniqueViolationToDuplicateNameError() {
        when(accounts.findByUserIdAndName(1L, "Cüzdan")).thenReturn(Optional.empty());
        when(accounts.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("ORA-00001"));

        assertThatThrownBy(() -> service.create(1L, CASH))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Bu adda bir hesap zaten var");
    }

    @Test
    void updateMapsUniqueViolationToDuplicateNameError() {
        Account existing = new Account(1L, "Eski", AccountType.CASH, "TRY", null);
        when(accounts.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(existing));
        when(accounts.findByUserIdAndName(1L, "Cüzdan")).thenReturn(Optional.empty());
        when(accounts.saveAndFlush(existing)).thenThrow(new DataIntegrityViolationException("ORA-00001"));

        assertThatThrownBy(() -> service.update(1L, 7L, CASH))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Bu adda bir hesap zaten var");
    }
}
