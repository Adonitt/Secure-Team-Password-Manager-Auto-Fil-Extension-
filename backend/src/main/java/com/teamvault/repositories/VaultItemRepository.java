package com.teamvault.repositories;

import com.teamvault.entities.VaultItem;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface VaultItemRepository extends JpaRepository<VaultItem, UUID> {
    List<VaultItem> findByCollectionWorkspaceId(UUID workspaceId);

    boolean existsByCollectionId(UUID collectionId);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from VaultItem i where i.id = :id")
    Optional<VaultItem> findLockedById(@Param("id") UUID id);
}
