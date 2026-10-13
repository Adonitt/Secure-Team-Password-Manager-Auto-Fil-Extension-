package com.teamvault.controllers;

import com.teamvault.dtos.UserKeyResponse;
import com.teamvault.services.AuthService;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {
    private final AuthService service;

    public UserController(AuthService service) {
        this.service = service;
    }

    @GetMapping("/lookup")
    public UserKeyResponse lookup(@RequestParam String email) {
        return service.lookup(email);
    }

    @GetMapping("/search")
    public List<UserKeyResponse> search(@RequestParam(defaultValue = "") String q) {
        return service.search(q);
    }

    @GetMapping("/{id}/public-key")
    public UserKeyResponse key(@PathVariable UUID id) {
        return service.publicKey(id);
    }
}
