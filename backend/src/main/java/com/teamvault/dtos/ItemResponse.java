package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record ItemResponse(
        UUID id,
        UUID ownerId,
        String ownerEmail,
        UUID collectionId,
        String ciphertext,
        String nonce,
        int version,
        String wrappedKey,
        String wrapType,
        Role role,
        boolean hasDirectShares) {}
