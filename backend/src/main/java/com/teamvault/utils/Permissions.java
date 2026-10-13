package com.teamvault.utils;

import com.teamvault.enums.Role;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Permissions {
    private Permissions() {}

    public static void require(Role role, Role minimum) {
        if (role == null || role.level() < minimum.level())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permission");
    }

    public static void assignable(Role role) {
        if (role == null || role == Role.OWNER)
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Choose Viewer, Editor or Admin");
    }
}
