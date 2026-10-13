package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record WorkspaceDetailsResponse(
        UUID id,
        String name,
        Role role,
        List<MemberResponse> members,
        List<CollectionResponse> collections) {}
