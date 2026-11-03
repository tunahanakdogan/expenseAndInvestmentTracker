package com.tunahan.finans.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final Duration tokenTtl;
    private final String initialUsername;
    private final String initialPassword;

    AuthService(AppUserRepository users,
                PasswordEncoder passwordEncoder,
                JwtEncoder jwtEncoder,
                @Value("${app.jwt.ttl}") Duration tokenTtl,
                @Value("${app.initial-user.username}") String initialUsername,
                @Value("${app.initial-user.password}") String initialPassword) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.tokenTtl = tokenTtl;
        this.initialUsername = initialUsername;
        this.initialPassword = initialPassword;
    }

    LoginResponse login(String username, String password) {
        AppUser user = users.findByUsername(username)
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı adı veya şifre hatalı"));

        Instant now = Instant.now();
        Instant expiresAt = now.plus(tokenTtl);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .build();
        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, expiresAt);
    }

    @EventListener(ApplicationReadyEvent.class)
    void createInitialUser() {
        if (users.count() > 0) {
            return;
        }
        if (initialUsername.isBlank() || initialPassword.isBlank()) {
            log.warn("Kayıtlı kullanıcı yok; APP_USERNAME ve APP_PASSWORD tanımlanmadığı için oluşturulmadı");
            return;
        }
        users.save(new AppUser(initialUsername, passwordEncoder.encode(initialPassword)));
        log.info("İlk kullanıcı oluşturuldu: {}", initialUsername);
    }
}
