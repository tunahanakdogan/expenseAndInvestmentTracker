package com.tunahan.finans.category;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByUserIdOrderById(Long userId);

    Optional<Category> findByIdAndUserId(Long id, Long userId);

    Optional<Category> findByUserIdAndName(Long userId, String name);
}
