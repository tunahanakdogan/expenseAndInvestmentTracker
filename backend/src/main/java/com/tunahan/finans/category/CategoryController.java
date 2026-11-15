package com.tunahan.finans.category;

import com.tunahan.finans.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
class CategoryController {

    private final CategoryService categories;

    CategoryController(CategoryService categories) {
        this.categories = categories;
    }

    @GetMapping
    List<CategoryResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return categories.list(CurrentUser.id(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    CategoryResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CategoryRequest request) {
        return categories.create(CurrentUser.id(jwt), request);
    }

    @PutMapping("/{id}")
    CategoryResponse rename(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                            @Valid @RequestBody CategoryRequest request) {
        return categories.rename(CurrentUser.id(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        categories.delete(CurrentUser.id(jwt), id);
    }
}

record CategoryRequest(@NotBlank @Size(max = 40) String name) {
}

record CategoryResponse(Long id, String name) {

    static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName());
    }
}
