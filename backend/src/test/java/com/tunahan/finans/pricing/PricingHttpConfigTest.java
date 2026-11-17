package com.tunahan.finans.pricing;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PricingHttpConfigTest {

    private HttpServer server;
    private int port;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/ua", exchange -> {
            byte[] body = exchange.getRequestHeaders().getFirst("User-Agent").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext("/encoding", exchange -> {
            String value = exchange.getRequestHeaders().getFirst("Accept-Encoding");
            byte[] body = (value == null ? "yok" : value).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().add("Location", "/ua");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.createContext("/slow", exchange -> {
            try {
                Thread.sleep(1000);
                exchange.sendResponseHeaders(200, -1);
            } catch (Exception ignored) {
                // istemci zaten bağlantıyı kopardı
            }
            exchange.close();
        });
        server.start();
        port = server.getAddress().getPort();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void sendsUserAgentHeader() {
        RestClient client = PricingHttpConfig.restClient(RestClient.builder(), Duration.ofSeconds(5), Duration.ofSeconds(10));

        assertThat(client.get().uri("http://localhost:" + port + "/ua").retrieve().body(String.class))
                .isEqualTo("finans-takip/0.0.1");
    }

    /** TCMB, sıkıştırma istenince çözülemeyen bir gövde döndürüyor (ZipException); sıkıştırma istenmez. */
    @Test
    void doesNotRequestCompressedResponses() {
        RestClient client = PricingHttpConfig.restClient(RestClient.builder(), Duration.ofSeconds(5), Duration.ofSeconds(10));

        assertThat(client.get().uri("http://localhost:" + port + "/encoding").retrieve().body(String.class))
                .isEqualTo("yok");
    }

    @Test
    void followsRedirects() {
        RestClient client = PricingHttpConfig.restClient(RestClient.builder(), Duration.ofSeconds(5), Duration.ofSeconds(10));

        assertThat(client.get().uri("http://localhost:" + port + "/redirect").retrieve().body(String.class))
                .isEqualTo("finans-takip/0.0.1");
    }

    @Test
    void readTimeoutThrowsResourceAccessException() {
        RestClient client = PricingHttpConfig.restClient(RestClient.builder(), Duration.ofSeconds(1), Duration.ofMillis(200));

        assertThatThrownBy(() -> client.get().uri("http://localhost:" + port + "/slow").retrieve().body(String.class))
                .isInstanceOf(ResourceAccessException.class);
    }

    @Test
    void pricingClockUsesIstanbulZone() {
        PricingClock clock = new PricingClock(Clock.fixed(Instant.parse("2026-11-15T22:30:00Z"), ZoneOffset.UTC));

        assertThat(clock.today()).isEqualTo(LocalDate.of(2026, 11, 16));
    }
}
