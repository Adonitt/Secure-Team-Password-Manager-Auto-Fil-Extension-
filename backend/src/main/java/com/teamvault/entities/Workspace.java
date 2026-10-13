package com.teamvault.entities;

import com.teamvault.enums.*;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "workspaces")
public class Workspace {
    @Id private UUID id = UUID.randomUUID();

    @Column(nullable = false, length = 120)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private AppUser owner;

    protected Workspace() {}

    public Workspace(String name, AppUser owner) {
        this.name = name;
        this.owner = owner;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AppUser getOwner() {
        return owner;
    }

    public void setOwner(AppUser owner) {
        this.owner = owner;
    }
}
