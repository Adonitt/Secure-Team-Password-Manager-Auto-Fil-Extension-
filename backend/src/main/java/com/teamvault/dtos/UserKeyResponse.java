package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record UserKeyResponse(UUID id, String firstName, String lastName, String email, String publicKey) {}
