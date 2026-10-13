package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 100) String firstName,
        @NotBlank @Size(min = 2, max = 100) String lastName,
        @Email @NotBlank @Size(max = 320) String email,
        @NotBlank @Size(min = 12, max = 200) String accountPassword,
        @NotBlank @Size(max = 100) String kdfSalt,
        @NotBlank @Size(max = 2000) String publicKey,
        @NotBlank @Size(max = 12000) String encryptedPrivateKey) {}
