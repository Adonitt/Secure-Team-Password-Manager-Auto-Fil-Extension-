package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.*;

public record RemoveMemberRequest(@Size(max = 1000) List<@NotNull @Valid ItemRekeyRequest> items) {}
