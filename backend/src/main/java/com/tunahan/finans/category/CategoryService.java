package com.tunahan.finans.category;

import com.tunahan.finans.common.BusinessRuleException;
import com.tunahan.finans.common.NotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    private static final List<String> DEFAULT_NAMES = List.of(
            "Market", "Yeme-İçme", "Ulaşım", "Fatura", "Kira", "Sağlık", "Giyim", "Eğlence", "Eğitim", "Diğer");

    private static final String DUPLICATE_NAME = "Bu adda bir kategori zaten var";

    private final CategoryRepository categories;
    private final CategoryUsage usage;

    CategoryService(CategoryRepository categories, CategoryUsage usage) {
        this.categories = categories;
        this.usage = usage;
    }

    /** Başka kullanıcının kategorisi de "bulunamadı" sayılır. */
    @Transactional(readOnly = true)
    public Category get(Long userId, Long id) {
        return categories.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Kategori bulunamadı"));
    }

    /**
     * Kullanıcının hiç kategorisi yoksa varsayılanları oluşturur. Bilerek @Transactional değil:
     * eşzamanlı iki ilk istekten biri unique ihlaline düşer; saveAll kendi transaction'ında geri alınır
     * ve diğer isteğin oluşturduğu liste okunur.
     */
    List<CategoryResponse> list(Long userId) {
        List<Category> found = categories.findByUserIdOrderById(userId);
        if (found.isEmpty()) {
            try {
                categories.saveAll(DEFAULT_NAMES.stream().map(name -> new Category(userId, name)).toList());
            } catch (DataIntegrityViolationException e) {
                // Aynı anda gelen başka bir istek varsayılanları oluşturdu.
            }
            found = categories.findByUserIdOrderById(userId);
        }
        return found.stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    CategoryResponse create(Long userId, CategoryRequest request) {
        String name = request.name().strip();
        requireUniqueName(userId, name, null);
        return CategoryResponse.from(saveWithUniqueName(new Category(userId, name)));
    }

    @Transactional
    CategoryResponse rename(Long userId, Long id, CategoryRequest request) {
        Category category = get(userId, id);
        String name = request.name().strip();
        requireUniqueName(userId, name, id);
        category.rename(name);
        return CategoryResponse.from(saveWithUniqueName(category));
    }

    @Transactional
    void delete(Long userId, Long id) {
        Category category = get(userId, id);
        if (usage.hasExpenses(id)) {
            throw new BusinessRuleException("Harcaması olan kategori silinemez");
        }
        categories.delete(category);
    }

    /**
     * Ad ön kontrolü eşzamanlı iki isteği ayıramaz; ikincisi unique kısıtına takılır. Hemen yazılır ki
     * ihlal burada yakalanıp aynı 422 mesajına çevrilsin (commit anında 500 olmasın).
     */
    private Category saveWithUniqueName(Category category) {
        try {
            categories.saveAndFlush(category);
            return category;
        } catch (DataIntegrityViolationException e) {
            throw new BusinessRuleException(DUPLICATE_NAME);
        }
    }

    private void requireUniqueName(Long userId, String name, Long ownId) {
        categories.findByUserIdAndName(userId, name)
                .filter(existing -> !existing.getId().equals(ownId))
                .ifPresent(existing -> {
                    throw new BusinessRuleException(DUPLICATE_NAME);
                });
    }
}
