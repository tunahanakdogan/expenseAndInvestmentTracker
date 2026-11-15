package com.tunahan.finans.category;

/**
 * Kategorinin başka modüllerde kullanılıp kullanılmadığı. Bağımlılık yönü expense → category olduğu için
 * category, expense'e doğrudan bakmaz; expense modülü bu arayüzü uygular.
 */
public interface CategoryUsage {

    boolean hasExpenses(Long categoryId);
}
