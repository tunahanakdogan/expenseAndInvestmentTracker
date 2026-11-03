package com.tunahan.finans.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Tüm API hataları ProblemDetail olarak döner; Spring MVC hataları üst sınıftan gelir. */
@RestControllerAdvice
class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    ProblemDetail badCredentials(BadCredentialsException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }
}
