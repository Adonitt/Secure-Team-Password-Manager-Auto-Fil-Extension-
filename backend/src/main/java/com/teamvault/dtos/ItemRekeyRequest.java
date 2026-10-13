package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.*;

public record ItemRekeyRequest(
        @NotNull UUID itemId,
        @NotBlank @Size(max = 1000000) String ciphertext,
        @NotBlank @Size(max = 32) String nonce,
        @Min(0) int version,
        @NotEmpty List<@NotNull @Valid RekeyGrant> grants) {}
