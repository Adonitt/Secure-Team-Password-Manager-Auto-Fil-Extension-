package com.teamvault.services;

import com.teamvault.dtos.*;
import com.teamvault.entities.*;
import com.teamvault.repositories.*;
import com.teamvault.security.*;
import com.teamvault.utils.CryptoPayloadValidator;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class AuthService {
    private final AppUserRepository users;
    private final SessionTokenRepository sessions;
    private final PasswordEncoder encoder;
    private final SecureRandom random = new SecureRandom();
    private final String dummyHash;

    public AuthService(
            AppUserRepository users, SessionTokenRepository sessions, PasswordEncoder encoder) {
        this.users = users;
        this.sessions = sessions;
        this.encoder = encoder;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public SessionResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        CryptoPayloadValidator.metadata(request.kdfSalt(), request.publicKey());
        var user =
                users.save(
                        new AppUser(
                                request.firstName().trim(),
                                request.lastName().trim(),
                                email,
                                encoder.encode(request.accountPassword()),
                                request.kdfSalt(),
                                request.publicKey(),
                                request.encryptedPrivateKey()));
        return issue(user);
    }

    @Transactional
    public SessionResponse login(LoginRequest request) {
        var user = users.findByEmail(normalizeEmail(request.email()));
        boolean valid =
                encoder.matches(
                        request.accountPassword(),
                        user.map(AppUser::getPasswordHash).orElse(dummyHash));
        if (!valid || user.isEmpty())
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Invalid email or account password");
        return issue(user.get());
    }

    private SessionResponse issue(AppUser user) {
        sessions.deleteByExpiresAtBefore(Instant.now());
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = Instant.now().plusSeconds(3600);
        sessions.save(new SessionToken(TokenHasher.hash(token), user, expiresAt));
        return new SessionResponse(
                token,
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                expiresAt);
    }

    @Transactional
    public void logout(String authorization) {
        sessions.deleteById(TokenHasher.hash(authorization.substring(7)));
    }

    public AppUser current() {
        return users.findById(CurrentUser.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public CryptoResponse crypto() {
        var user = current();
        return new CryptoResponse(
                user.getKdfSalt(), user.getPublicKey(), user.getEncryptedPrivateKey());
    }

    public UserResponse me() {
        var user = current();
        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail());
    }

    public UserKeyResponse lookup(String email) {
        return key(
                users.findByEmail(normalizeEmail(email))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Registered user not found")));
    }

    public List<UserKeyResponse> search(String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() < 2) return List.of();
        return users.findTop10ByEmailContainingIgnoreCaseOrderByEmailAsc(normalized).stream()
                .map(this::key)
                .toList();
    }

    public UserKeyResponse publicKey(UUID id) {
        return key(
                users.findById(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "User not found")));
    }

    private UserKeyResponse key(AppUser user) {
        return new UserKeyResponse(
                user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(), user.getPublicKey());
    }
}
