package com.tunahan.finans;

import com.jayway.jsonpath.JsonPath;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Hesap, kategori ve harcama testleri için: her test kendi kullanıcısını açar, veriler çakışmaz. */
public final class ExpenseTestSupport {

    private ExpenseTestSupport() {
    }

    /** Benzersiz adla bir kullanıcı ekler (yalnız FK için; giriş yapılamaz). */
    public static long newUser(JdbcTemplate jdbc) {
        String username = "test-" + UUID.randomUUID();
        jdbc.update("insert into app_user (username, password_hash, created_at) values (?, 'x', systimestamp)", username);
        return jdbc.queryForObject("select id from app_user where username = ?", Long.class, username);
    }

    /** İsteği verilen kullanıcının kimliğiyle gönderir (JWT subject = kullanıcı id). */
    public static RequestPostProcessor asUser(long userId) {
        return SecurityMockMvcRequestPostProcessors.jwt().jwt(j -> j.subject(Long.toString(userId)));
    }

    /** Ham SQL ile tek ödemeli bir harcama ekler; harcama id'sini döner. */
    public static long insertExpense(JdbcTemplate jdbc, long userId, long accountId, long categoryId) {
        String marker = UUID.randomUUID().toString();
        jdbc.update("""
                insert into expense (user_id, account_id, category_id, description, expense_date,
                                     total_amount, currency, installment_count, created_at)
                values (?, ?, ?, ?, date '2026-11-10', 10, 'TRY', 1, systimestamp)
                """, userId, accountId, categoryId, marker);
        long expenseId = jdbc.queryForObject("select id from expense where description = ?", Long.class, marker);
        jdbc.update("""
                insert into expense_payment (expense_id, installment_no, period, amount, currency)
                values (?, 1, '2026-11', 10, 'TRY')
                """, expenseId);
        return expenseId;
    }

    /** Ham SQL ile kategori ekler (varsayılan tohumlamayı tetiklemeden). */
    public static long insertCategory(JdbcTemplate jdbc, long userId, String name) {
        jdbc.update("insert into category (user_id, name, created_at) values (?, ?, systimestamp)", userId, name);
        return jdbc.queryForObject("select id from category where user_id = ? and name = ?", Long.class, userId, name);
    }

    /** Ham SQL ile nakit TRY hesabı ekler. */
    public static long insertAccount(JdbcTemplate jdbc, long userId, String name) {
        jdbc.update("insert into account (user_id, name, type, currency, created_at) values (?, ?, 'CASH', 'TRY', systimestamp)",
                userId, name);
        return jdbc.queryForObject("select id from account where user_id = ? and name = ?", Long.class, userId, name);
    }

    /** Yanıt gövdesindeki {@code $.id}. */
    public static long idOf(MvcTestResult result) {
        try {
            Number id = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.id");
            return id.longValue();
        } catch (Exception e) {
            throw new IllegalStateException("Yanıtta id yok: " + result.getResponse().getStatus(), e);
        }
    }
}
