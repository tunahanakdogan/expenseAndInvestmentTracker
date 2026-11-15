package com.tunahan.finans.investment;

import com.jayway.jsonpath.JsonPath;
import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.pricing.PriceQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/**
 * Yatırım API testlerinin ortak tabanı: fiyat servisi mock'lu tek bir Spring context'i paylaşırlar.
 * Her test kendi kullanıcısını açar; veriler test sonunda geri alınır.
 */
@IntegrationTest
@Transactional
abstract class InvestmentApiTestBase {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    JdbcClient jdbc;
    @MockitoBean
    PriceQueryService prices;

    long newUser() {
        String username = "u-" + UUID.randomUUID();
        jdbc.sql("INSERT INTO app_user (username, password_hash, created_at) VALUES (?, 'x', SYSTIMESTAMP)")
                .param(username).update();
        return jdbc.sql("SELECT id FROM app_user WHERE username = ?").param(username).query(Long.class).single();
    }

    RequestPostProcessor as(long userId) {
        return jwt().jwt(j -> j.subject(Long.toString(userId)));
    }

    MvcTestResult get(long userId, String uri) {
        return mvc.get().uri(uri).with(as(userId)).exchange();
    }

    MvcTestResult post(long userId, String uri, String json) {
        return mvc.post().uri(uri).with(as(userId)).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    MvcTestResult put(long userId, String uri, String json) {
        return mvc.put().uri(uri).with(as(userId)).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    MvcTestResult delete(long userId, String uri) {
        return mvc.delete().uri(uri).with(as(userId)).exchange();
    }

    MvcTestResult postAsset(long userId, String type, String symbol, String name) {
        return post(userId, "/api/assets", """
                {"type": "%s", "symbol": "%s", "name": "%s"}
                """.formatted(type, symbol, name));
    }

    long createAsset(long userId, String type, String symbol, String name) {
        MvcTestResult result = postAsset(userId, type, symbol, name);
        assertThat(result).hasStatus(HttpStatus.CREATED);
        return ((Number) path(result, "$.id")).longValue();
    }

    /** Null verilen alanlar gövdeye konmaz. */
    MvcTestResult postTx(long userId, long assetId, String type, String date, String qty, String price,
                         String commission, String fx) {
        StringBuilder json = new StringBuilder(
                "{\"assetId\": %d, \"type\": \"%s\", \"tradeDate\": \"%s\", \"quantity\": \"%s\", \"unitPrice\": \"%s\""
                        .formatted(assetId, type, date, qty, price));
        if (commission != null) {
            json.append(", \"commission\": \"").append(commission).append('"');
        }
        if (fx != null) {
            json.append(", \"fxRateTry\": \"").append(fx).append('"');
        }
        return post(userId, "/api/investments/transactions", json.append('}').toString());
    }

    /** Yanıt gövdesinden JSONPath ile değer okur; alan null ise null döner. */
    static <T> T path(MvcTestResult result, String jsonPath) {
        try {
            return JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8), jsonPath);
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static String str(MvcTestResult result, String jsonPath) {
        return path(result, jsonPath);
    }

    static void assertRejected(MvcTestResult result, HttpStatus status, String detail) {
        assertThat(result).hasStatus(status);
        assertThat(str(result, "$.detail")).isEqualTo(detail);
    }
}
