package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record NameRequest(@NotBlank @Size(max = 120) String name) {}
