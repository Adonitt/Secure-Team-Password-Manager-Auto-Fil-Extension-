package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.*;

public record AddMemberRequest(
        @Email @NotBlank @Size(max = 320) String email,
        @NotNull Role role,
        @Size(max = 1000) List<@NotNull @Valid EnvelopeRequest> envelopes) {}
