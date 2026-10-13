package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record LoginRequest(
        @Email @NotBlank @Size(max = 320) String email,
        @NotBlank @Size(max = 200) String accountPassword) {}
