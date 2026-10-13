package com.teamvault.controllers;

import com.teamvault.dtos.*;
import com.teamvault.services.WorkspaceService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/workspaces")
public class WorkspaceController {
    private final WorkspaceService service;

    public WorkspaceController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping
    public List<WorkspaceResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceResponse create(@Valid @RequestBody NameRequest request) {
        return service.create(request);
    }

    @GetMapping("/{id}")
    public WorkspaceDetailsResponse details(@PathVariable UUID id) {
        return service.details(id);
    }

    @PostMapping("/{id}/collections")
    @ResponseStatus(HttpStatus.CREATED)
    public CollectionResponse collection(
            @PathVariable UUID id, @Valid @RequestBody NameRequest request) {
        return service.createCollection(id, request);
    }

    @PutMapping("/{id}")
    public WorkspaceResponse update(
            @PathVariable UUID id, @Valid @RequestBody NameRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PutMapping("/{id}/collections/{collectionId}")
    public CollectionResponse updateCollection(
            @PathVariable UUID id,
            @PathVariable UUID collectionId,
            @Valid @RequestBody NameRequest request) {
        return service.updateCollection(id, collectionId, request);
    }

    @DeleteMapping("/{id}/collections/{collectionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCollection(
            @PathVariable UUID id, @PathVariable UUID collectionId) {
        service.deleteCollection(id, collectionId);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(@PathVariable UUID id, @Valid @RequestBody AddMemberRequest request) {
        service.addMember(id, request);
    }

    @PutMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void role(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody RoleRequest request) {
        service.changeRole(id, userId, request);
    }

    @PostMapping("/{id}/members/{userId}/remove")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody RemoveMemberRequest request) {
        service.removeMember(id, userId, request);
    }
}
