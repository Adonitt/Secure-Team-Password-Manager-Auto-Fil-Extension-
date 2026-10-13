package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record MemberResponse(
        UUID id, String firstName, String lastName, String email, String publicKey, Role role) {}
