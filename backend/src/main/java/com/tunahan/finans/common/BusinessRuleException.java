package com.tunahan.finans.common;

/** 422; mesaj kullanıcıya gösterilir, Türkçe olmalı. */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
