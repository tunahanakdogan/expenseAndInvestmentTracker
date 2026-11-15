package com.tunahan.finans;

import com.jayway.jsonpath.JsonPath;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;

/** Entegrasyon testlerinde giriş yapıp "Authorization" başlığı değeri üretir. */
public final class TestAuth {

    public static final String USERNAME = "tunahan";
    public static final String PASSWORD = "gizli-sifre";

    private TestAuth() {
    }

    /** "Bearer &lt;token&gt;" döner. */
    public static String bearer(MockMvcTester mvc) {
        MvcTestResult result = mvc.post().uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"username": "%s", "password": "%s"}
                        """.formatted(USERNAME, PASSWORD))
                .exchange();
        try {
            String token = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.token");
            return "Bearer " + token;
        } catch (Exception e) {
            throw new IllegalStateException("Test girişi başarısız: " + result.getResponse().getStatus(), e);
        }
    }
}
