package com.tunahan.finans.account;

import com.tunahan.finans.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.tunahan.finans.ExpenseTestSupport.asUser;
import static com.tunahan.finans.ExpenseTestSupport.idOf;
import static com.tunahan.finans.ExpenseTestSupport.insertCategory;
import static com.tunahan.finans.ExpenseTestSupport.insertExpense;
import static com.tunahan.finans.ExpenseTestSupport.newUser;
import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@Transactional
class AccountControllerTest {

    private static final String CASH = """
            {"name":"Cüzdan","type":"CASH","currency":"TRY"}""";
    private static final String CARD = """
            {"name":"Bonus","type":"CREDIT_CARD","currency":"TRY","statementDay":15}""";
    private static final String LOCKED = "Harcaması olan hesabın türü, para birimi veya kesim günü değiştirilemez";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    JdbcTemplate jdbc;

    long user;

    @BeforeEach
    void setUp() {
        user = newUser(jdbc);
    }

    @Test
    void createsCashAccountAndListsOnlyOwnAccounts() {
        MvcTestResult created = post(user, CASH);
        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.id").isNotNull();
        assertThat(created).bodyJson().extractingPath("$.statementDay").isNull();

        assertThat(list(user)).hasStatusOk().bodyJson().extractingPath("$[*].name").isEqualTo(List.of("Cüzdan"));
        assertThat(list(newUser(jdbc))).hasStatusOk().bodyJson().extractingPath("$.length()").isEqualTo(0);
    }

    @Test
    void createsCreditCardWithStatementDay() {
        MvcTestResult created = post(user, CARD);
        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.statementDay").isEqualTo(15);
        assertThat(created).bodyJson().extractingPath("$.type").isEqualTo("CREDIT_CARD");
    }

    @Test
    void creditCardWithoutStatementDayReturns422() {
        assertThat(post(user, """
                {"name":"Bonus","type":"CREDIT_CARD","currency":"TRY"}"""))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Kredi kartı için kesim günü (1–31) zorunlu");
    }

    @Test
    void statementDayOutOfRangeReturns400() {
        for (int day : new int[]{0, 32}) {
            assertThat(post(user, """
                    {"name":"Bonus","type":"CREDIT_CARD","currency":"TRY","statementDay":%d}""".formatted(day)))
                    .hasStatus(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void statementDayIsIgnoredForNonCard() {
        MvcTestResult created = post(user, """
                {"name":"Vadesiz","type":"BANK","currency":"TRY","statementDay":10}""");
        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.statementDay").isNull();
    }

    @Test
    void unsupportedCurrencyOrBlankNameReturns400() {
        assertThat(post(user, """
                {"name":"Sterlin","type":"BANK","currency":"GBP"}""")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(user, """
                {"name":" ","type":"CASH","currency":"TRY"}""")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(user, """
                {"name":"%s","type":"CASH","currency":"TRY"}""".formatted("a".repeat(61))))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void duplicateNameReturns422ButOtherUserMayReuseIt() {
        post(user, CASH);

        assertThat(post(user, CASH)).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Bu adda bir hesap zaten var");
        assertThat(post(user, """
                {"name":" Cüzdan ","type":"BANK","currency":"TRY"}""")).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Bu adda bir hesap zaten var");
        assertThat(post(newUser(jdbc), CASH)).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void renamingToAnotherAccountsNameReturns422ButKeepingOwnNameIsAllowed() {
        post(user, CASH);
        long card = idOf(post(user, CARD));

        assertThat(put(user, card, """
                {"name":"Cüzdan","type":"CREDIT_CARD","currency":"TRY","statementDay":15}"""))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Bu adda bir hesap zaten var");
        assertThat(put(user, card, CARD)).hasStatusOk();
    }

    @Test
    void renameIsAllowedWhenAccountHasExpenses() {
        long card = idOf(post(user, CARD));
        insertExpense(jdbc, user, card, insertCategory(jdbc, user, "Market"));

        assertThat(put(user, card, """
                {"name":"Bonus Platinum","type":"CREDIT_CARD","currency":"TRY","statementDay":15}"""))
                .hasStatusOk()
                .bodyJson().extractingPath("$.name").isEqualTo("Bonus Platinum");
    }

    @Test
    void changingTypeCurrencyOrStatementDayWithExpensesReturns422() {
        long card = idOf(post(user, CARD));
        insertExpense(jdbc, user, card, insertCategory(jdbc, user, "Market"));

        List<String> changes = List.of(
                """
                {"name":"Bonus","type":"CREDIT_CARD","currency":"TRY","statementDay":20}""",
                """
                {"name":"Bonus","type":"CREDIT_CARD","currency":"USD","statementDay":15}""",
                """
                {"name":"Bonus","type":"BANK","currency":"TRY"}""");
        for (String change : changes) {
            assertThat(put(user, card, change)).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                    .bodyJson().extractingPath("$.detail").isEqualTo(LOCKED);
        }
    }

    @Test
    void changingStatementDayWithoutExpensesIsAllowed() {
        long card = idOf(post(user, CARD));

        assertThat(put(user, card, """
                {"name":"Bonus","type":"CREDIT_CARD","currency":"TRY","statementDay":20}"""))
                .hasStatusOk()
                .bodyJson().extractingPath("$.statementDay").isEqualTo(20);
    }

    @Test
    void deleteReturns204AndAccountWithExpensesReturns422() {
        long cash = idOf(post(user, CASH));
        long card = idOf(post(user, CARD));
        insertExpense(jdbc, user, card, insertCategory(jdbc, user, "Market"));

        assertThat(delete(user, cash)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(list(user)).bodyJson().extractingPath("$[*].name").isEqualTo(List.of("Bonus"));
        assertThat(delete(user, card)).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Harcaması olan hesap silinemez");
    }

    @Test
    void otherUsersAccountReturns404() {
        long cash = idOf(post(user, CASH));
        long other = newUser(jdbc);

        assertThat(put(other, cash, CASH)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(delete(other, cash)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(list(user)).bodyJson().extractingPath("$.length()").isEqualTo(1);
    }

    @Test
    void withoutTokenReturns401() {
        assertThat(mvc.get().uri("/api/accounts")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private MvcTestResult list(long userId) {
        return mvc.get().uri("/api/accounts").with(asUser(userId)).exchange();
    }

    private MvcTestResult post(long userId, String json) {
        return mvc.post().uri("/api/accounts").with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult put(long userId, long id, String json) {
        return mvc.put().uri("/api/accounts/{id}", id).with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult delete(long userId, long id) {
        return mvc.delete().uri("/api/accounts/{id}", id).with(asUser(userId)).exchange();
    }
}
