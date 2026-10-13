package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record GrantInput(
        @NotNull UUID userId, @NotBlank @Size(max = 1000) String wrappedKey, @NotNull Role role) {}
