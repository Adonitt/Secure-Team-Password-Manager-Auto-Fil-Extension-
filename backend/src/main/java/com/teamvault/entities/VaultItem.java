package com.teamvault.entities;

import com.teamvault.enums.*;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "items")
public class VaultItem {
    @Id private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private AppUser owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id")
    private VaultCollection collection;

    @Column(nullable = false, columnDefinition = "text")
    private String ciphertext;

    @Column(nullable = false, length = 32)
    private String nonce;

    @Version private int version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected VaultItem() {}

    public VaultItem(AppUser owner, VaultCollection collection, String ciphertext, String nonce) {
        this.owner = owner;
        this.collection = collection;
        this.ciphertext = ciphertext;
        this.nonce = nonce;
    }

    public UUID getId() {
        return id;
    }

    public AppUser getOwner() {
        return owner;
    }

    public void setOwner(AppUser owner) {
        this.owner = owner;
    }

    public VaultCollection getCollection() {
        return collection;
    }

    public void setCollection(VaultCollection collection) {
        this.collection = collection;
    }

    public String getCiphertext() {
        return ciphertext;
    }

    public void setCiphertext(String ciphertext) {
        this.ciphertext = ciphertext;
    }

    public String getNonce() {
        return nonce;
    }

    public void setNonce(String nonce) {
        this.nonce = nonce;
    }

    public int getVersion() {
        return version;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
