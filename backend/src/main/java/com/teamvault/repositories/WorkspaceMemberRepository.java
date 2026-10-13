package com.teamvault.repositories;

import com.teamvault.entities.WorkspaceMember;

import org.springframework.data.jpa.repository.*;

import java.util.*;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {
    @EntityGraph(attributePaths = {"workspace", "user"})
    List<WorkspaceMember> findByUserId(UUID userId);

    @EntityGraph(attributePaths = {"user"})
    List<WorkspaceMember> findByWorkspaceId(UUID workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}
