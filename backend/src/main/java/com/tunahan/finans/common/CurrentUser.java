package com.tunahan.finans.common;

import org.springframework.security.oauth2.jwt.Jwt;

/** JWT subject'i kullanıcı id'sidir (bkz. auth.AuthService). Her sorgu bu id ile filtrelenir. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Long id(Jwt jwt) {
        try {
            return Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Token subject'i kullanıcı id'si değil: " + jwt.getSubject(), e);
        }
    }
}
