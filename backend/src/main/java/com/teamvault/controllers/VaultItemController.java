package com.teamvault.controllers;

import com.teamvault.dtos.*;
import com.teamvault.services.VaultItemService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/items")
public class VaultItemController {
    private final VaultItemService service;

    public VaultItemController(VaultItemService service) {
        this.service = service;
    }

    @GetMapping
    public List<ItemResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public ItemResponse one(@PathVariable UUID id) {
        return service.one(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse create(@Valid @RequestBody CreateItemRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ItemResponse update(
            @PathVariable UUID id, @Valid @RequestBody UpdateItemRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/move")
    public ItemResponse move(
            @PathVariable UUID id, @Valid @RequestBody MoveItemRequest request) {
        return service.move(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/{id}/grants")
    public List<GrantResponse> grants(@PathVariable UUID id) {
        return service.grants(id);
    }

    @PostMapping("/{id}/shares")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void share(@PathVariable UUID id, @Valid @RequestBody ShareRequest request) {
        service.share(id, request);
    }

    @PutMapping("/{id}/shares/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void role(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody RoleRequest request) {
        service.changeRole(id, userId, request);
    }

    @PostMapping("/{id}/rekey")
    public ItemResponse rekey(@PathVariable UUID id, @Valid @RequestBody RekeyRequest request) {
        return service.rekey(id, request);
    }
}
