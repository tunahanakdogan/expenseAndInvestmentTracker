package com.tunahan.finans.category;

import com.tunahan.finans.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static com.tunahan.finans.ExpenseTestSupport.asUser;
import static com.tunahan.finans.ExpenseTestSupport.idOf;
import static com.tunahan.finans.ExpenseTestSupport.insertAccount;
import static com.tunahan.finans.ExpenseTestSupport.insertExpense;
import static com.tunahan.finans.ExpenseTestSupport.newUser;
import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@Transactional
class CategoryControllerTest {

    private static final List<String> DEFAULTS = List.of(
            "Market", "Yeme-İçme", "Ulaşım", "Fatura", "Kira", "Sağlık", "Giyim", "Eğlence", "Eğitim", "Diğer");

    @Autowired
    MockMvcTester mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    CategoryService categoryService;

    long user;

    @BeforeEach
    void setUp() {
        user = newUser(jdbc);
    }

    @Test
    void firstGetSeedsDefaultCategoriesInOrder() {
        assertThat(list(user)).hasStatusOk().bodyJson().extractingPath("$[*].name").isEqualTo(DEFAULTS);
    }

    @Test
    void secondGetDoesNotSeedAgain() {
        list(user);
        assertThat(list(user)).hasStatusOk().bodyJson().extractingPath("$.length()").isEqualTo(10);

        assertThat(countCategories(user)).isEqualTo(10);
    }

    /** İki ilk istek aynı anda gelirse biri unique ihlaline düşer; ikisi de aynı 10 kategoriyi görmeli. */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentFirstListsSeedOnce() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<List<CategoryResponse>>> results = List.of(
                    pool.submit(() -> {
                        start.await();
                        return categoryService.list(user);
                    }),
                    pool.submit(() -> {
                        start.await();
                        return categoryService.list(user);
                    }));
            start.countDown();

            for (Future<List<CategoryResponse>> result : results) {
                assertThat(result.get(60, TimeUnit.SECONDS)).extracting(CategoryResponse::name)
                        .containsExactlyElementsOf(DEFAULTS);
            }
            assertThat(countCategories(user)).isEqualTo(10);
        } finally {
            pool.shutdownNow();
            jdbc.update("delete from category where user_id = ?", user);
            jdbc.update("delete from app_user where id = ?", user);
        }
    }

    @Test
    void createsRenamesAndDeletesCategory() {
        MvcTestResult created = post(user, "Evcil Hayvan");
        assertThat(created).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.name").isEqualTo("Evcil Hayvan");
        long id = idOf(created);

        assertThat(put(user, id, "Kedi")).hasStatusOk().bodyJson().extractingPath("$.name").isEqualTo("Kedi");
        assertThat(delete(user, id)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(list(user)).bodyJson().extractingPath("$[*].name").isEqualTo(DEFAULTS);
    }

    @Test
    void duplicateNameReturns422() {
        list(user);
        long pet = idOf(post(user, "Evcil Hayvan"));

        assertThat(post(user, " Market ")).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Bu adda bir kategori zaten var");
        assertThat(put(user, pet, "Market")).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Bu adda bir kategori zaten var");
        assertThat(put(user, pet, "Evcil Hayvan")).hasStatusOk();
    }

    @Test
    void blankOrTooLongNameReturns400() {
        assertThat(post(user, "")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(post(user, "a".repeat(41))).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void categoryWithExpensesCannotBeDeleted() {
        long category = idOf(post(user, "Evcil Hayvan"));
        insertExpense(jdbc, user, insertAccount(jdbc, user, "Cüzdan"), category);

        assertThat(delete(user, category)).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson().extractingPath("$.detail").isEqualTo("Harcaması olan kategori silinemez");
    }

    @Test
    void otherUsersCategoryReturns404() {
        long category = idOf(post(user, "Evcil Hayvan"));
        long other = newUser(jdbc);

        assertThat(put(other, category, "Kedi")).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(delete(other, category)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void withoutTokenReturns401() {
        assertThat(mvc.get().uri("/api/categories")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private int countCategories(long userId) {
        return jdbc.queryForObject("select count(*) from category where user_id = ?", Integer.class, userId);
    }

    private MvcTestResult list(long userId) {
        return mvc.get().uri("/api/categories").with(asUser(userId)).exchange();
    }

    private MvcTestResult post(long userId, String name) {
        return mvc.post().uri("/api/categories").with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(body(name)).exchange();
    }

    private MvcTestResult put(long userId, long id, String name) {
        return mvc.put().uri("/api/categories/{id}", id).with(asUser(userId))
                .contentType(MediaType.APPLICATION_JSON).content(body(name)).exchange();
    }

    private MvcTestResult delete(long userId, long id) {
        return mvc.delete().uri("/api/categories/{id}", id).with(asUser(userId)).exchange();
    }

    private static String body(String name) {
        return "{\"name\":\"" + name + "\"}";
    }
}
