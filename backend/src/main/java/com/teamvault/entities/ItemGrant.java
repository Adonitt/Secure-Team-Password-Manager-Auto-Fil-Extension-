package com.teamvault.entities;

import com.teamvault.enums.*;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(
        name = "item_grants",
        uniqueConstraints = @UniqueConstraint(columnNames = {"item_id", "user_id"}))
public class ItemGrant {
    @Id private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id")
    private VaultItem item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(name = "wrapped_key", nullable = false, columnDefinition = "text")
    private String wrappedKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private GrantSource source;

    protected ItemGrant() {}

    public ItemGrant(
            VaultItem item, AppUser user, String wrappedKey, Role role, GrantSource source) {
        this.item = item;
        this.user = user;
        this.wrappedKey = wrappedKey;
        this.role = role;
        this.source = source;
    }

    public UUID getId() {
        return id;
    }

    public VaultItem getItem() {
        return item;
    }

    public void setItem(VaultItem item) {
        this.item = item;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public String getWrappedKey() {
        return wrappedKey;
    }

    public void setWrappedKey(String wrappedKey) {
        this.wrappedKey = wrappedKey;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public GrantSource getSource() {
        return source;
    }

    public void setSource(GrantSource source) {
        this.source = source;
    }
}
