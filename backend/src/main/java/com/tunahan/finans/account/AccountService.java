package com.tunahan.finans.account;

import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.NotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class AccountService {

    private static final String DUPLICATE_NAME = "Bu adda bir hesap zaten var";

    private final AccountRepository accounts;
    private final AccountUsage usage;

    AccountService(AccountRepository accounts, AccountUsage usage) {
        this.accounts = accounts;
        this.usage = usage;
    }

    /** Başka kullanıcının hesabı da "bulunamadı" sayılır. */
    @Transactional(readOnly = true)
    public Account get(Long userId, Long id) {
        return accounts.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Hesap bulunamadı"));
    }

    @Transactional(readOnly = true)
    List<AccountResponse> list(Long userId) {
        return accounts.findByUserIdOrderById(userId).stream().map(AccountResponse::from).toList();
    }

    @Transactional
    AccountResponse create(Long userId, AccountRequest request) {
        String name = request.name().strip();
        requireUniqueName(userId, name, null);
        Account account = new Account(userId, name, request.type(), request.currency(), statementDay(request));
        return AccountResponse.from(saveWithUniqueName(account));
    }

    @Transactional
    AccountResponse update(Long userId, Long id, AccountRequest request) {
        Account account = get(userId, id);
        String name = request.name().strip();
        requireUniqueName(userId, name, id);
        Integer statementDay = statementDay(request);

        // Dönemler bu üç alandan türetilir; harcama varken değişirlerse eski ödemeler sessizce yanlış kalır.
        boolean periodFieldsChanged = account.getType() != request.type()
                || !account.getCurrency().equals(request.currency())
                || !Objects.equals(account.getStatementDay(), statementDay);
        if (periodFieldsChanged && usage.hasExpenses(id)) {
            throw new BusinessRuleException(
                    "Harcaması olan hesabın türü, para birimi veya kesim günü değiştirilemez");
        }
        account.update(name, request.type(), request.currency(), statementDay);
        return AccountResponse.from(saveWithUniqueName(account));
    }

    @Transactional
    void delete(Long userId, Long id) {
        Account account = get(userId, id);
        if (usage.hasExpenses(id)) {
            throw new BusinessRuleException("Harcaması olan hesap silinemez");
        }
        accounts.delete(account);
    }

    /** Kesim günü yalnız kredi kartında anlamlıdır; diğer türlerde gelen değer yok sayılır. */
    private static Integer statementDay(AccountRequest request) {
        if (request.type() != AccountType.CREDIT_CARD) {
            return null;
        }
        if (request.statementDay() == null) {
            throw new BusinessRuleException("Kredi kartı için kesim günü (1–31) zorunlu");
        }
        return request.statementDay();
    }

    /**
     * Ad ön kontrolü eşzamanlı iki isteği ayıramaz; ikincisi unique kısıtına takılır. Hemen yazılır ki
     * ihlal burada yakalanıp aynı 422 mesajına çevrilsin (commit anında 500 olmasın).
     */
    private Account saveWithUniqueName(Account account) {
        try {
            accounts.saveAndFlush(account);
            return account;
        } catch (DataIntegrityViolationException e) {
            throw new BusinessRuleException(DUPLICATE_NAME);
        }
    }

    private void requireUniqueName(Long userId, String name, Long ownId) {
        accounts.findByUserIdAndName(userId, name)
                .filter(existing -> !existing.getId().equals(ownId))
                .ifPresent(existing -> {
                    throw new BusinessRuleException(DUPLICATE_NAME);
                });
    }
}
