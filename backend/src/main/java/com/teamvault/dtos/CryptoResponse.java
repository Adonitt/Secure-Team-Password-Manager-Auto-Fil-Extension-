package com.teamvault.dtos;

import com.teamvault.enums.*;

import jakarta.validation.constraints.*;

import java.util.*;

public record CryptoResponse(String kdfSalt, String publicKey, String encryptedPrivateKey) {}
