package com.teamvault.entities;

import com.teamvault.enums.*;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "users")
public class AppUser {
    @Id private UUID id = UUID.randomUUID();

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false, columnDefinition = "text")
    private String passwordHash;

    @Column(name = "kdf_salt", nullable = false, columnDefinition = "text")
    private String kdfSalt;

    @Column(name = "public_key", nullable = false, columnDefinition = "text")
    private String publicKey;

    @Column(name = "encrypted_private_key", nullable = false, columnDefinition = "text")
    private String encryptedPrivateKey;

    protected AppUser() {}

    /** Convenience constructor kept for service-level tests and local fixtures. */
    public AppUser(
            String email,
            String passwordHash,
            String kdfSalt,
            String publicKey,
            String encryptedPrivateKey) {
        this("Demo", "User", email, passwordHash, kdfSalt, publicKey, encryptedPrivateKey);
    }

    public AppUser(
            String firstName,
            String lastName,
            String email,
            String passwordHash,
            String kdfSalt,
            String publicKey,
            String encryptedPrivateKey) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.kdfSalt = kdfSalt;
        this.publicKey = publicKey;
        this.encryptedPrivateKey = encryptedPrivateKey;
    }

    public UUID getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getKdfSalt() {
        return kdfSalt;
    }

    public void setKdfSalt(String kdfSalt) {
        this.kdfSalt = kdfSalt;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    public String getEncryptedPrivateKey() {
        return encryptedPrivateKey;
    }

    public void setEncryptedPrivateKey(String encryptedPrivateKey) {
        this.encryptedPrivateKey = encryptedPrivateKey;
    }
}
