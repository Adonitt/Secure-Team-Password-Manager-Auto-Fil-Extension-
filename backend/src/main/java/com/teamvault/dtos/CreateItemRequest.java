package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.*;

public record CreateItemRequest(
        @NotBlank @Size(max = 1000000) String ciphertext,
        @NotBlank @Size(max = 32) String nonce,
        @NotBlank @Size(max = 1000) String ownerWrappedKey,
        UUID collectionId,
        @Size(max = 100) List<@NotNull @Valid GrantInput> collectionGrants) {}
