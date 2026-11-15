package com.tunahan.finans.account;

/**
 * Hesabın başka modüllerde kullanılıp kullanılmadığı. Bağımlılık yönü expense → account olduğu için
 * account, expense'e doğrudan bakmaz; expense modülü bu arayüzü uygular.
 */
public interface AccountUsage {

    boolean hasExpenses(Long accountId);
}
