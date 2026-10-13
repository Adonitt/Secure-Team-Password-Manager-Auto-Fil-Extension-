package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record UpdateItemRequest(
        @NotBlank @Size(max = 1000000) String ciphertext,
        @NotBlank @Size(max = 32) String nonce,
        @Min(0) int version) {}
