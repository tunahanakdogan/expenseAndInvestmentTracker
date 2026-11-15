package com.tunahan.finans.expense;

import com.tunahan.finans.IntegrationTest;
import jakarta.persistence.EntityManager;
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
import static com.tunahan.finans.ExpenseTestSupport.newUser;
import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@Transactional
class ExpenseControllerTest {

    private static final String CASH = """
            {"name":"Cüzdan","type":"CASH","currency":"TRY"}""";
    private static final String CARD_15 = """
            {"name":"Bonus","type":"CREDIT_CARD","currency":"TRY","statementDay":15}""";
    private static final String USD_BANK = """
            {"name":"Dolar","type":"BANK","currency":"USD"}""";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    EntityManager entityManager;

    long user;
    long category;

    @BeforeEach
    void setUp() {
        user = newUser(jdbc);
        category = createCategory(user, "Elektronik");
    }

    @Test
    void cashExpenseCreatesSinglePaymentInExpenseMonth() {
        long cash = createAccount(user, CASH);

        MvcTestResult created = post(user, """
                {"accountId":%d,"categoryId":%d,"amount":"250.50","date":"2026-11-30","installmentCount":1,
                 "description":"Haftalık"}""".formatted(cash, category));

        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.id").isNotNull();
        assertThat(created).bodyJson().extractingPath("$.totalAmount").isEqualTo("250.5000");
        assertThat(created).bodyJson().extractingPath("$.currency").isEqualTo("TRY");
        assertThat(created).bodyJson().extractingPath("$.date").isEqualTo("2026-11-30");
        assertThat(created).bodyJson().extractingPath("$.installmentCount").isEqualTo(1);
        assertThat(created).bodyJson().extractingPath("$.description").isEqualTo("Haftalık");
        assertThat(created).bodyJson().extractingPath("$.accountId").isEqualTo((int) cash);
        assertThat(created).bodyJson().extractingPath("$.accountName").isEqualTo("Cüzdan");
        assertThat(created).bodyJson().extractingPath("$.categoryId").isEqualTo((int) category);
        assertThat(created).bodyJson().extractingPath("$.categoryName").isEqualTo("Elektronik");
        assertThat(created).bodyJson().extractingPath("$.payments.length()").isEqualTo(1);
        assertThat(created).bodyJson().extractingPath("$.payments[0].installmentNo").isEqualTo(1);
        assertThat(created).bodyJson().extractingPath("$.payments[0].period").isEqualTo("2026-11");
        assertThat(created).bodyJson().extractingPath("$.payments[0].amount").isEqualTo("250.5000");
        assertThat(created).bodyJson().extractingPath("$.payments[0].status").isEqualTo("ACTIVE");
    }

    @Test
    void creditCardInstallmentsFollowStatementDayAcrossYearEnd() {
        long card = createAccount(user, CARD_15);

        MvcTestResult created = createExpense(user, card, category, "100.00", "2026-12-20", 3);

        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.payments[*].period")
                .isEqualTo(List.of("2027-01", "2027-02", "2027-03"));
        assertThat(created).bodyJson().extractingPath("$.payments[*].amount")
                .isEqualTo(List.of("33.3300", "33.3300", "33.3400"));
        assertThat(created).bodyJson().extractingPath("$.totalAmount").isEqualTo("100.0000");
    }

    @Test
    void singlePaymentOnCardAfterStatementDayGoesToNextMonth() {
        long card = createAccount(user, CARD_15);

        assertThat(createExpense(user, card, category, "80.00", "2026-11-16", 1))
                .bodyJson().extractingPath("$.payments[0].period").isEqualTo("2026-12");
    }

    @Test
    void expenseCurrencyComesFromAccount() {
        long bank = createAccount(user, USD_BANK);

        MvcTestResult created = createExpense(user, bank, category, "20.00", "2026-11-05", 1);
        assertThat(created).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.currency").isEqualTo("USD");
        long id = idOf(created);

        reload();
        assertThat(get(user, id)).hasStatusOk().bodyJson().extractingPath("$.currency").isEqualTo("USD");
        assertThat(jdbc.queryForObject("select currency from expense_payment where expense_id = ?", String.class, id))
                .isEqualTo("USD");
    }

    @Test
    void installmentsOnCashAccountReturn422() {
        long cash = createAccount(user, CASH);

        assertThat(createExpense(user, cash, category, "100.00", "2026-11-10", 2))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Taksit yalnız kredi kartında yapılabilir");
    }

    @Test
    void tooSmallAmountForInstallmentsReturns422() {
        long card = createAccount(user, CARD_15);

        assertThat(createExpense(user, card, category, "0.26", "2026-11-10", 36))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Tutar bu taksit sayısına bölünemeyecek kadar küçük");
    }

    @Test
    void invalidRequestReturns400() {
        long card = createAccount(user, CARD_15);

        assertThat(createExpense(user, card, category, "10.00", "2026-11-10", 0)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(createExpense(user, card, category, "10.00", "2026-11-10", 37)).hasStatus(HttpStatus.BAD_REQUEST);
        for (String amount : List.of("0", "-5", "10.005")) {
            assertThat(createExpense(user, card, category, amount, "2026-11-10", 1))
                    .as(amount).hasStatus(HttpStatus.BAD_REQUEST);
        }
        assertThat(post(user, """
                {"accountId":%d,"categoryId":%d,"amount":"10.00","installmentCount":1}""".formatted(card, category)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(user, """
                {"accountId":%d,"categoryId":%d,"amount":"10.00","date":"2026-11-10","installmentCount":1,
                 "description":"%s"}""".formatted(card, category, "a".repeat(201))))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void blankDescriptionIsStoredAsNull() {
        long cash = createAccount(user, CASH);

        MvcTestResult created = post(user, """
                {"accountId":%d,"categoryId":%d,"amount":"10.00","date":"2026-11-10","installmentCount":1,
                 "description":"  "}""".formatted(cash, category));

        assertThat(created).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.description").isNull();
    }

    @Test
    void otherUsersAccountOrCategoryReturns404() {
        long cash = createAccount(user, CASH);
        long other = newUser(jdbc);
        long othersAccount = createAccount(other, CASH);
        long othersCategory = createCategory(other, "Elektronik");

        assertThat(createExpense(user, othersAccount, category, "10.00", "2026-11-10", 1))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(createExpense(user, cash, othersCategory, "10.00", "2026-11-10", 1))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void getReturnsExpenseWithAllInstallments() {
        long card = createAccount(user, CARD_15);
        long id = idOf(createExpense(user, card, category, "600.00", "2026-10-10", 6));

        reload();
        MvcTestResult found = get(user, id);

        assertThat(found).hasStatusOk();
        assertThat(found).bodyJson().extractingPath("$.payments[*].installmentNo").isEqualTo(List.of(1, 2, 3, 4, 5, 6));
        assertThat(found).bodyJson().extractingPath("$.payments[5].period").isEqualTo("2027-03");
        assertThat(found).bodyJson().extractingPath("$.totalAmount").isEqualTo("600.0000");
        assertThat(found).bodyJson().extractingPath("$.accountName").isEqualTo("Bonus");
    }

    @Test
    void otherUsersExpenseReturns404() {
        long cash = createAccount(user, CASH);
        long id = idOf(createExpense(user, cash, category, "10.00", "2026-11-10", 1));
        long other = newUser(jdbc);

        assertThat(get(other, id)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(delete(other, id)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get(user, id)).hasStatusOk();
    }

    @Test
    void deleteRemovesExpenseAndItsPayments() {
        long card = createAccount(user, CARD_15);
        long id = idOf(createExpense(user, card, category, "100.00", "2026-11-10", 3));
        reload();

        assertThat(delete(user, id)).hasStatus(HttpStatus.NO_CONTENT);

        reload();
        assertThat(get(user, id)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(jdbc.queryForObject("select count(*) from expense_payment where expense_id = ?", Integer.class, id))
                .isZero();
    }

    @Test
    void accountAndCategoryWithExpensesCannotBeDeleted() {
        long cash = createAccount(user, CASH);
        createExpense(user, cash, category, "10.00", "2026-11-10", 1);

        assertThat(mvc.delete().uri("/api/accounts/{id}", cash).with(asUser(user)))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(mvc.delete().uri("/api/categories/{id}", category).with(asUser(user)))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
    }

    @Test
    void periodListReturnsThatMonthsPaymentsNewestFirstWithTotalsPerCurrency() {
        long card = createAccount(user, CARD_15);
        long cash = createAccount(user, CASH);
        long bank = createAccount(user, USD_BANK);
        long phone = idOf(post(user, """
                {"accountId":%d,"categoryId":%d,"amount":"600.00","date":"2026-10-10","installmentCount":6,
                 "description":"Telefon"}""".formatted(card, category)));
        long b = idOf(createExpense(user, cash, category, "50.00", "2026-11-20", 1));
        long c = idOf(createExpense(user, bank, category, "20.00", "2026-11-05", 1));
        createExpense(user, cash, category, "999.00", "2026-12-01", 1);
        reload();

        MvcTestResult listed = list(user, "2026-11");

        assertThat(listed).hasStatusOk();
        assertThat(listed).bodyJson().extractingPath("$.period").isEqualTo("2026-11");
        assertThat(listed).bodyJson().extractingPath("$.payments[*].expenseId")
                .isEqualTo(List.of((int) b, (int) c, (int) phone));
        assertThat(listed).bodyJson().extractingPath("$.payments[*].expenseDate")
                .isEqualTo(List.of("2026-11-20", "2026-11-05", "2026-10-10"));
        assertThat(listed).bodyJson().extractingPath("$.payments[2].installmentNo").isEqualTo(2);
        assertThat(listed).bodyJson().extractingPath("$.payments[2].installmentCount").isEqualTo(6);
        assertThat(listed).bodyJson().extractingPath("$.payments[2].amount").isEqualTo("100.0000");
        assertThat(listed).bodyJson().extractingPath("$.payments[2].currency").isEqualTo("TRY");
        assertThat(listed).bodyJson().extractingPath("$.payments[2].description").isEqualTo("Telefon");
        assertThat(listed).bodyJson().extractingPath("$.payments[2].categoryName").isEqualTo("Elektronik");
        assertThat(listed).bodyJson().extractingPath("$.payments[2].accountName").isEqualTo("Bonus");
        assertThat(listed).bodyJson().extractingPath("$.payments[1].currency").isEqualTo("USD");
        assertThat(listed).bodyJson().extractingPath("$.totals[*].currency").isEqualTo(List.of("TRY", "USD"));
        assertThat(listed).bodyJson().extractingPath("$.totals[*].amount").isEqualTo(List.of("150.0000", "20.0000"));
    }

    @Test
    void sameDayExpensesAreListedNewestFirst() {
        long cash = createAccount(user, CASH);
        long first = idOf(createExpense(user, cash, category, "1.00", "2026-11-10", 1));
        long second = idOf(createExpense(user, cash, category, "2.00", "2026-11-10", 1));
        reload();

        assertThat(list(user, "2026-11")).bodyJson().extractingPath("$.payments[*].expenseId")
                .isEqualTo(List.of((int) second, (int) first));
    }

    @Test
    void emptyPeriodReturnsEmptyPaymentsAndTotals() {
        MvcTestResult listed = list(user, "2030-01");

        assertThat(listed).hasStatusOk();
        assertThat(listed).bodyJson().extractingPath("$.payments.length()").isEqualTo(0);
        assertThat(listed).bodyJson().extractingPath("$.totals.length()").isEqualTo(0);
    }

    @Test
    void missingOrInvalidPeriodReturns400() {
        assertThat(mvc.get().uri("/api/expenses").with(asUser(user))).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(list(user, "2026-13")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(list(user, "kasim")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void otherUsersPaymentsAreNotListed() {
        long cash = createAccount(user, CASH);
        createExpense(user, cash, category, "50.00", "2026-11-20", 1);
        reload();

        assertThat(list(newUser(jdbc), "2026-11")).hasStatusOk()
                .bodyJson().extractingPath("$.payments.length()").isEqualTo(0);
    }

    @Test
    void editingInstallmentRecalculatesTotal() {
        long card = createAccount(user, CARD_15);
        long id = idOf(createExpense(user, card, category, "100.00", "2026-11-10", 3));
        reload();

        MvcTestResult edited = putPayment(user, id, 3, "40.00");

        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.totalAmount").isEqualTo("106.6600");
        assertThat(edited).bodyJson().extractingPath("$.payments[*].amount")
                .isEqualTo(List.of("33.3300", "33.3300", "40.0000"));

        reload();
        MvcTestResult found = get(user, id);
        assertThat(found).bodyJson().extractingPath("$.totalAmount").isEqualTo("106.6600");
        assertThat(found).bodyJson().extractingPath("$.payments[2].amount").isEqualTo("40.0000");
        assertThat(found).bodyJson().extractingPath("$.payments[0].amount").isEqualTo("33.3300");
        assertThat(list(user, "2027-01")).bodyJson().extractingPath("$.totals[0].amount").isEqualTo("40.0000");
    }

    @Test
    void editingInstallmentWithInvalidAmountReturns400() {
        long card = createAccount(user, CARD_15);
        long id = idOf(createExpense(user, card, category, "100.00", "2026-11-10", 3));

        for (String amount : List.of("0", "-1", "1.005")) {
            assertThat(putPayment(user, id, 1, amount)).as(amount).hasStatus(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void editingUnknownInstallmentReturns404() {
        long card = createAccount(user, CARD_15);
        long id = idOf(createExpense(user, card, category, "100.00", "2026-11-10", 3));

        assertThat(putPayment(user, id, 9, "40.00")).hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson().extractingPath("$.detail").isEqualTo("Taksit bulunamadı");
    }

    @Test
    void editingOtherUsersExpenseReturns404() {
        long card = createAccount(user, CARD_15);
        long id = idOf(createExpense(user, card, category, "100.00", "2026-11-10", 3));

        assertThat(putPayment(newUser(jdbc), id, 1, "40.00")).hasStatus(HttpStatus.NOT_FOUND);
    }

    private MvcTestResult list(long userId, String period) {
        return mvc.get().uri("/api/expenses?period={period}", period).with(asUser(userId)).exchange();
    }

    private MvcTestResult putPayment(long userId, long id, int installmentNo, String amount) {
        return mvc.put().uri("/api/expenses/{id}/payments/{no}", id, installmentNo).with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":\"" + amount + "\"}").exchange();
    }

    @Test
    void withoutTokenReturns401() {
        assertThat(mvc.get().uri("/api/expenses?period=2026-11")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    /** Bekleyen SQL'i yazar ve önbelleği boşaltır; sonraki istek veriyi gerçekten DB'den okur. */
    private void reload() {
        entityManager.flush();
        entityManager.clear();
    }

    private long createAccount(long userId, String json) {
        return idOf(mvc.post().uri("/api/accounts").with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange());
    }

    private long createCategory(long userId, String name) {
        return idOf(mvc.post().uri("/api/categories").with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\"}").exchange());
    }

    private MvcTestResult createExpense(long userId, long accountId, long categoryId, String amount, String date,
                                        int installmentCount) {
        return post(userId, """
                {"accountId":%d,"categoryId":%d,"amount":"%s","date":"%s","installmentCount":%d}"""
                .formatted(accountId, categoryId, amount, date, installmentCount));
    }

    private MvcTestResult post(long userId, String json) {
        return mvc.post().uri("/api/expenses").with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult get(long userId, long id) {
        return mvc.get().uri("/api/expenses/{id}", id).with(asUser(userId)).exchange();
    }

    private MvcTestResult delete(long userId, long id) {
        return mvc.delete().uri("/api/expenses/{id}", id).with(asUser(userId)).exchange();
    }
}
