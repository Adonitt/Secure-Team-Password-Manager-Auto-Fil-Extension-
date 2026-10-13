package com.teamvault.repositories;

import com.teamvault.entities.AppUser;

import org.springframework.data.jpa.repository.*;

import java.util.*;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmail(String email);

    List<AppUser> findTop10ByEmailContainingIgnoreCaseOrderByEmailAsc(String email);

    boolean existsByEmail(String email);
}
