package com.teamvault.repositories;

import com.teamvault.entities.Workspace;

import org.springframework.data.jpa.repository.*;

import java.util.*;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {}
