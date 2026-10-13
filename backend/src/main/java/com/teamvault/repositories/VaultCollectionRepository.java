package com.teamvault.repositories;

import com.teamvault.entities.VaultCollection;

import org.springframework.data.jpa.repository.*;

import java.util.*;

public interface VaultCollectionRepository extends JpaRepository<VaultCollection, UUID> {
    List<VaultCollection> findByWorkspaceId(UUID workspaceId);
}
