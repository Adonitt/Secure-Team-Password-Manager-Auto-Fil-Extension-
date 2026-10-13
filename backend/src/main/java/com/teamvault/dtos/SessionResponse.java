package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.*;

public record SessionResponse(
        String token,
        UUID userId,
        String firstName,
        String lastName,
        String email,
        Instant expiresAt) {}
