package com.tunahan.finans.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByUserIdOrderById(Long userId);

    Optional<Account> findByIdAndUserId(Long id, Long userId);

    Optional<Account> findByUserIdAndName(Long userId, String name);
}
