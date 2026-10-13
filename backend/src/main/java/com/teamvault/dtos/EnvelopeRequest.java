package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record EnvelopeRequest(
        @NotNull UUID itemId, @NotBlank @Size(max = 1000) String wrappedKey) {}
