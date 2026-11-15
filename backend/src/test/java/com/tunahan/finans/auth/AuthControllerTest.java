package com.tunahan.finans.auth;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.TestAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
class AuthControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void loginWithValidCredentialsReturnsTokenThatOpensProtectedEndpoint() {
        assertThat(mvc.get().uri("/api/auth/me").header("Authorization", TestAuth.bearer(mvc)))
                .hasStatusOk()
                .bodyJson().extractingPath("$.username").isEqualTo(TestAuth.USERNAME);
    }

    @Test
    void loginWithWrongPasswordReturns401ProblemDetail() {
        assertThat(login(TestAuth.USERNAME, "yanlis"))
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.detail").isEqualTo("Kullanıcı adı veya şifre hatalı");
    }

    @Test
    void loginWithBlankFieldsReturns400() {
        assertThat(login("", "")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void protectedEndpointWithoutTokenReturns401() {
        assertThat(mvc.get().uri("/api/auth/me")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void protectedEndpointWithForgedTokenReturns401() {
        assertThat(mvc.get().uri("/api/auth/me").header("Authorization", "Bearer abc.def.ghi"))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private MvcTestResult login(String username, String password) {
        return mvc.post().uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"username": "%s", "password": "%s"}
                        """.formatted(username, password))
                .exchange();
    }
}
