package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record GrantResponse(
        UUID userId,
        String email,
        String publicKey,
        String wrappedKey,
        String wrapType,
        Role role,
        GrantSource source) {}
