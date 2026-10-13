package com.teamvault.utils;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public final class CryptoPayloadValidator {
    private CryptoPayloadValidator() {}

    public static byte[] decode(String value) {
        try {
            return Base64.getDecoder().decode(value);
        } catch (Exception e) {
            throw invalid();
        }
    }

    public static void cipher(String ciphertext, String nonce) {
        if (ciphertext == null
                || ciphertext.length() > 1_000_000
                || decode(ciphertext).length < 16
                || decode(nonce).length != 12) throw invalid();
    }

    public static void wrappedKey(String value) {
        if (value == null || value.length() > 1000 || decode(value).length != 256) throw invalid();
    }

    public static void metadata(String salt, String publicKey) {
        try {
            if (decode(salt).length != 16) throw invalid();
            var rsa =
                    (RSAPublicKey)
                            KeyFactory.getInstance("RSA")
                                    .generatePublic(new X509EncodedKeySpec(decode(publicKey)));
            if (rsa.getModulus().bitLength() != 2048) throw invalid();
        } catch (Exception e) {
            throw invalid();
        }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid encrypted payload");
    }
}
