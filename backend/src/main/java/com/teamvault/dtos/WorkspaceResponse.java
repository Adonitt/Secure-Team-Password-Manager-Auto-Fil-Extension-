package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record WorkspaceResponse(UUID id, String name, Role role) {}
