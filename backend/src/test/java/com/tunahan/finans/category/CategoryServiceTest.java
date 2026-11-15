package com.tunahan.finans.category;

import com.tunahan.finans.common.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Eşzamanlı iki istek ön kontrolü birlikte geçerse unique kısıtı devreye girer; yanıt yine 422 olmalı. */
class CategoryServiceTest {

    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final CategoryService service = new CategoryService(categories, categoryId -> false);

    @Test
    void createMapsUniqueViolationToDuplicateNameError() {
        when(categories.findByUserIdAndName(1L, "Market")).thenReturn(Optional.empty());
        when(categories.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("ORA-00001"));

        assertThatThrownBy(() -> service.create(1L, new CategoryRequest("Market")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Bu adda bir kategori zaten var");
    }

    @Test
    void renameMapsUniqueViolationToDuplicateNameError() {
        Category existing = new Category(1L, "Eski");
        when(categories.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(existing));
        when(categories.findByUserIdAndName(1L, "Market")).thenReturn(Optional.empty());
        when(categories.saveAndFlush(existing)).thenThrow(new DataIntegrityViolationException("ORA-00001"));

        assertThatThrownBy(() -> service.rename(1L, 7L, new CategoryRequest("Market")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Bu adda bir kategori zaten var");
    }
}
