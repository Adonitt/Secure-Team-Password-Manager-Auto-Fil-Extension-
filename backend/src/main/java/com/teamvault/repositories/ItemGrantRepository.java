package com.teamvault.repositories;

import com.teamvault.entities.ItemGrant;

import org.springframework.data.jpa.repository.*;

import java.util.*;

public interface ItemGrantRepository extends JpaRepository<ItemGrant, UUID> {
    @EntityGraph(attributePaths = {"item", "item.owner", "item.collection"})
    List<ItemGrant> findByUserIdOrderByItemUpdatedAtDesc(UUID userId);

    Optional<ItemGrant> findByItemIdAndUserId(UUID itemId, UUID userId);

    @EntityGraph(attributePaths = {"user"})
    List<ItemGrant> findByItemId(UUID itemId);

    boolean existsByItemIdAndUserId(UUID itemId, UUID userId);

    boolean existsByItemIdAndSource(UUID itemId, com.teamvault.enums.GrantSource source);

    void deleteByItemId(UUID itemId);
}
