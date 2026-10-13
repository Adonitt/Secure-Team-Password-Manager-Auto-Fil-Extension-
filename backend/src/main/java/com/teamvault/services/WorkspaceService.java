package com.teamvault.services;

import com.teamvault.dtos.*;
import com.teamvault.entities.*;
import com.teamvault.enums.*;
import com.teamvault.repositories.*;
import com.teamvault.security.CurrentUser;
import com.teamvault.utils.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class WorkspaceService {
    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final VaultCollectionRepository collections;
    private final VaultItemRepository items;
    private final ItemGrantRepository grants;
    private final AppUserRepository users;
    private final VaultItemService vault;

    public WorkspaceService(
            WorkspaceRepository workspaces,
            WorkspaceMemberRepository members,
            VaultCollectionRepository collections,
            VaultItemRepository items,
            ItemGrantRepository grants,
            AppUserRepository users,
            VaultItemService vault) {
        this.workspaces = workspaces;
        this.members = members;
        this.collections = collections;
        this.items = items;
        this.grants = grants;
        this.users = users;
        this.vault = vault;
    }

    private WorkspaceMember membership(UUID workspaceId, UUID userId) {
        return members.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
    }

    private void requireAdmin(UUID id) {
        Permissions.require(membership(id, CurrentUser.id()).getRole(), Role.ADMIN);
    }

    public List<WorkspaceResponse> list() {
        return members.findByUserId(CurrentUser.id()).stream()
                .map(
                        member ->
                                new WorkspaceResponse(
                                        member.getWorkspace().getId(),
                                        member.getWorkspace().getName(),
                                        member.getRole()))
                .toList();
    }

    @Transactional
    public WorkspaceResponse create(NameRequest request) {
        var user = users.findById(CurrentUser.id()).orElseThrow();
        var workspace = workspaces.save(new Workspace(request.name().trim(), user));
        members.save(new WorkspaceMember(workspace, user, Role.OWNER));
        return new WorkspaceResponse(workspace.getId(), workspace.getName(), Role.OWNER);
    }

    @Transactional
    public WorkspaceResponse update(UUID id, NameRequest request) {
        requireAdmin(id);
        var workspace = workspaces.findById(id).orElseThrow();
        workspace.setName(request.name().trim());
        return new WorkspaceResponse(
                workspace.getId(), workspace.getName(), membership(id, CurrentUser.id()).getRole());
    }

    @Transactional
    public void delete(UUID id) {
        requireAdmin(id);
        var workspace = workspaces.findById(id).orElseThrow();
        if (!items.findByCollectionWorkspaceId(id).isEmpty())
            throw bad("Remove collection credentials before deleting this team");
        members.deleteAll(members.findByWorkspaceId(id));
        collections.deleteAll(collections.findByWorkspaceId(id));
        workspaces.delete(workspace);
    }

    public WorkspaceDetailsResponse details(UUID id) {
        var member = membership(id, CurrentUser.id());
        var memberDtos =
                members.findByWorkspaceId(id).stream()
                        .map(
                                value ->
                                        new MemberResponse(
                                                value.getUser().getId(),
                                                value.getUser().getFirstName(),
                                                value.getUser().getLastName(),
                                                value.getUser().getEmail(),
                                                value.getUser().getPublicKey(),
                                                value.getRole()))
                        .toList();
        var folders =
                collections.findByWorkspaceId(id).stream()
                        .map(value -> new CollectionResponse(value.getId(), value.getName()))
                        .toList();
        return new WorkspaceDetailsResponse(
                id, member.getWorkspace().getName(), member.getRole(), memberDtos, folders);
    }

    @Transactional
    public CollectionResponse createCollection(UUID id, NameRequest request) {
        requireAdmin(id);
        var collection =
                collections.save(
                        new VaultCollection(
                                workspaces.findById(id).orElseThrow(), request.name().trim()));
        return new CollectionResponse(collection.getId(), collection.getName());
    }

    @Transactional
    public CollectionResponse updateCollection(
            UUID workspaceId, UUID collectionId, NameRequest request) {
        requireAdmin(workspaceId);
        var collection = collection(workspaceId, collectionId);
        collection.setName(request.name().trim());
        return new CollectionResponse(collection.getId(), collection.getName());
    }

    @Transactional
    public void deleteCollection(UUID workspaceId, UUID collectionId) {
        requireAdmin(workspaceId);
        var collection = collection(workspaceId, collectionId);
        if (items.existsByCollectionId(collectionId))
            throw bad("Remove collection credentials before deleting this collection");
        collections.delete(collection);
    }

    private VaultCollection collection(UUID workspaceId, UUID collectionId) {
        var collection =
                collections
                        .findById(collectionId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Collection not found"));
        if (!collection.getWorkspace().getId().equals(workspaceId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found");
        return collection;
    }

    @Transactional
    public void addMember(UUID id, AddMemberRequest request) {
        requireAdmin(id);
        Permissions.assignable(request.role());
        var target =
                users.findByEmail(AuthService.normalizeEmail(request.email()))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Registered user not found"));
        if (members.existsByWorkspaceIdAndUserId(id, target.getId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a team member");
        if (members.findByWorkspaceId(id).size() >= 100)
            throw bad("Demo teams support up to 100 members");
        var teamItems = items.findByCollectionWorkspaceId(id);
        var envelopes =
                request.envelopes() == null ? List.<EnvelopeRequest>of() : request.envelopes();
        Set<UUID> provided = new HashSet<>();
        for (var envelope : envelopes) {
            CryptoPayloadValidator.wrappedKey(envelope.wrappedKey());
            if (!provided.add(envelope.itemId())) throw bad("Duplicate item key");
        }
        if (!provided.equals(teamItems.stream().map(VaultItem::getId).collect(Collectors.toSet())))
            throw bad("Every collection credential needs an encrypted key");
        members.save(
                new WorkspaceMember(workspaces.findById(id).orElseThrow(), target, request.role()));
        var itemMap =
                teamItems.stream().collect(Collectors.toMap(VaultItem::getId, value -> value));
        for (var envelope : envelopes) {
            if (grants.existsByItemIdAndUserId(envelope.itemId(), target.getId()))
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Remove this user's direct share before adding them to this team");
            grants.save(
                    new ItemGrant(
                            itemMap.get(envelope.itemId()),
                            target,
                            envelope.wrappedKey(),
                            request.role(),
                            GrantSource.COLLECTION));
        }
    }

    @Transactional
    public void changeRole(UUID id, UUID userId, RoleRequest request) {
        requireAdmin(id);
        Permissions.assignable(request.role());
        var target = membership(id, userId);
        if (target.getRole() == Role.OWNER) throw bad("Team owner role cannot be changed");
        target.setRole(request.role());
        for (var item : items.findByCollectionWorkspaceId(id)) {
            grants.findByItemIdAndUserId(item.getId(), userId)
                    .filter(grant -> grant.getSource() == GrantSource.COLLECTION)
                    .ifPresent(grant -> grant.setRole(request.role()));
        }
    }

    @Transactional
    public void removeMember(UUID id, UUID userId, RemoveMemberRequest request) {
        requireAdmin(id);
        var member = membership(id, userId);
        if (member.getRole() == Role.OWNER) throw bad("Team owner cannot be removed");
        var teamItems = items.findByCollectionWorkspaceId(id);
        if (teamItems.stream().anyMatch(item -> item.getOwner().getId().equals(userId)))
            throw bad("Delete this member's owned credentials before removing them");
        var expected =
                teamItems.stream()
                        .filter(
                                item ->
                                        grants.findByItemIdAndUserId(item.getId(), userId)
                                                .map(
                                                        grant ->
                                                                grant.getSource()
                                                                        == GrantSource.COLLECTION)
                                                .orElse(false))
                        .map(VaultItem::getId)
                        .collect(Collectors.toSet());
        var rekeys = request.items() == null ? List.<ItemRekeyRequest>of() : request.items();
        Set<UUID> provided = new HashSet<>();
        for (var item : rekeys) if (!provided.add(item.itemId())) throw bad("Duplicate credential");
        if (!provided.equals(expected)) throw bad("Rotate the key of every affected credential");
        for (var item : rekeys)
            vault.rekeyInternal(
                    item.itemId(),
                    new RekeyRequest(
                            item.ciphertext(), item.nonce(), item.version(), item.grants(), userId),
                    userId);
        members.delete(member);
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
