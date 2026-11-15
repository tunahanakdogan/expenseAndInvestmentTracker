package com.tunahan.finans;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Oracle (Testcontainers) + MockMvc ile tam uygulama. Tüm entegrasyon testleri bunu kullanır;
 * aynı yapılandırma sayesinde Spring context'i ve Oracle container'ı testler arasında paylaşılır.
 * İlk kullanıcı: {@link TestAuth#USERNAME} / {@link TestAuth#PASSWORD}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
        "app.jwt.secret=test-secret-test-secret-test-secret-123",
        "app.initial-user.username=" + TestAuth.USERNAME,
        "app.initial-user.password=" + TestAuth.PASSWORD,
        // Zamanlanmış fiyat çekimi testlerde gerçek dış kaynaklara gitmesin
        "app.pricing.enabled=false"
})
@AutoConfigureMockMvc
public @interface IntegrationTest {
}
