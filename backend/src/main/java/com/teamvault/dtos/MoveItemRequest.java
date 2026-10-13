package com.teamvault.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.*;

public record MoveItemRequest(
        UUID collectionId,
        @Size(max = 100) List<@NotNull @Valid GrantInput> collectionGrants,
        @Min(0) int version) {}
