package com.tunahan.finans.auth;

import com.jayway.jsonpath.JsonPath;
import com.tunahan.finans.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
        "app.jwt.secret=test-secret-test-secret-test-secret-123",
        "app.initial-user.username=tunahan",
        "app.initial-user.password=gizli-sifre"
})
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void loginWithValidCredentialsReturnsTokenThatOpensProtectedEndpoint() throws Exception {
        MvcTestResult login = login("tunahan", "gizli-sifre");
        assertThat(login).hasStatusOk();
        String token = JsonPath.read(login.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.token");

        assertThat(mvc.get().uri("/api/auth/me").header("Authorization", "Bearer " + token))
                .hasStatusOk()
                .bodyJson().extractingPath("$.username").isEqualTo("tunahan");
    }

    @Test
    void loginWithWrongPasswordReturns401ProblemDetail() {
        assertThat(login("tunahan", "yanlis"))
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
