package com.teamvault.entities;

import com.teamvault.enums.*;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "collections")
public class VaultCollection {
    @Id private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @Column(nullable = false, length = 120)
    private String name;

    protected VaultCollection() {}

    public VaultCollection(Workspace workspace, String name) {
        this.workspace = workspace;
        this.name = name;
    }

    public UUID getId() {
        return id;
    }

    public Workspace getWorkspace() {
        return workspace;
    }

    public void setWorkspace(Workspace workspace) {
        this.workspace = workspace;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
