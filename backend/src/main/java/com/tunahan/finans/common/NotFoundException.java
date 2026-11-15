package com.tunahan.finans.common;

/** 404; başka kullanıcıya ait kayıtlar da "bulunamadı" sayılır. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
