package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record ShareRequest(
        @Email @NotBlank @Size(max = 320) String email,
        @NotBlank @Size(max = 1000) String wrappedKey,
        @NotNull Role role) {}
