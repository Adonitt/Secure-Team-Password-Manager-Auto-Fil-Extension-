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

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VaultItemService {
    private final VaultItemRepository items;
    private final ItemGrantRepository grants;
    private final AppUserRepository users;
    private final VaultCollectionRepository collections;
    private final WorkspaceMemberRepository members;

    public VaultItemService(
            VaultItemRepository items,
            ItemGrantRepository grants,
            AppUserRepository users,
            VaultCollectionRepository collections,
            WorkspaceMemberRepository members) {
        this.items = items;
        this.grants = grants;
        this.users = users;
        this.collections = collections;
        this.members = members;
    }

    public ItemGrant access(UUID itemId, UUID userId) {
        return grants.findByItemIdAndUserId(itemId, userId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Credential not found"));
    }

    private ItemResponse response(ItemGrant grant) {
        var item = grant.getItem();
        return new ItemResponse(
                item.getId(),
                item.getOwner().getId(),
                item.getOwner().getEmail(),
                item.getCollection() == null ? null : item.getCollection().getId(),
                item.getCiphertext(),
                item.getNonce(),
                item.getVersion(),
                grant.getWrappedKey(),
                "RSA",
                grant.getRole(),
                grants.existsByItemIdAndSource(item.getId(), GrantSource.DIRECT));
    }

    public List<ItemResponse> list() {
        return grants.findByUserIdOrderByItemUpdatedAtDesc(CurrentUser.id()).stream()
                .map(this::response)
                .toList();
    }

    public ItemResponse one(UUID id) {
        return response(access(id, CurrentUser.id()));
    }

    @Transactional
    public ItemResponse create(CreateItemRequest request) {
        CryptoPayloadValidator.cipher(request.ciphertext(), request.nonce());
        CryptoPayloadValidator.wrappedKey(request.ownerWrappedKey());
        var owner = users.findById(CurrentUser.id()).orElseThrow();
        VaultCollection collection = null;
        var requested =
                request.collectionGrants() == null
                        ? List.<GrantInput>of()
                        : request.collectionGrants();
        if (request.collectionId() == null && !requested.isEmpty())
            throw bad("Unexpected collection grants");
        if (request.collectionId() != null) {
            collection =
                    collections
                            .findById(request.collectionId())
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.NOT_FOUND, "Collection not found"));
            UUID workspaceId = collection.getWorkspace().getId();
            var membership =
                    members.findByWorkspaceIdAndUserId(workspaceId, owner.getId())
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.FORBIDDEN,
                                                    "Collection access denied"));
            // Creating a new credential in a team collection is reserved for
            // team admins and owners. Editors can still edit credentials they
            // already have access to.
            Permissions.require(membership.getRole(), Role.ADMIN);
            var expected =
                    members.findByWorkspaceId(workspaceId).stream()
                            .filter(member -> !member.getUser().getId().equals(owner.getId()))
                            .collect(
                                    Collectors.toMap(
                                            member -> member.getUser().getId(),
                                            member ->
                                                    member.getRole() == Role.OWNER
                                                            ? Role.ADMIN
                                                            : member.getRole()));
            Set<UUID> provided = new HashSet<>();
            for (var input : requested) {
                CryptoPayloadValidator.wrappedKey(input.wrappedKey());
                if (!provided.add(input.userId()) || input.role() != expected.get(input.userId()))
                    throw bad("Collection roles must match membership");
            }
            if (!provided.equals(expected.keySet()))
                throw bad("Every collection member needs an encrypted key");
        }
        var item =
                items.save(new VaultItem(owner, collection, request.ciphertext(), request.nonce()));
        grants.save(
                new ItemGrant(
                        item, owner, request.ownerWrappedKey(), Role.OWNER, GrantSource.OWNER));
        for (var input : requested) {
            var user = users.findById(input.userId()).orElseThrow();
            grants.save(
                    new ItemGrant(
                            item, user, input.wrappedKey(), input.role(), GrantSource.COLLECTION));
        }
        items.flush();
        return one(item.getId());
    }

    @Transactional
    public ItemResponse update(UUID id, UpdateItemRequest request) {
        Permissions.require(access(id, CurrentUser.id()).getRole(), Role.EDITOR);
        CryptoPayloadValidator.cipher(request.ciphertext(), request.nonce());
        var item = locked(id, request.version());
        item.setCiphertext(request.ciphertext());
        item.setNonce(request.nonce());
        item.setUpdatedAt(Instant.now());
        items.flush();
        return one(id);
    }

    @Transactional
    public ItemResponse move(UUID id, MoveItemRequest request) {
        var access = access(id, CurrentUser.id());
        Permissions.require(access.getRole(), Role.EDITOR);
        var item = locked(id, request.version());
        var owner = item.getOwner();
        var requested =
                request.collectionGrants() == null
                        ? List.<GrantInput>of()
                        : request.collectionGrants();
        VaultCollection collection = null;
        Map<UUID, Role> expected = new HashMap<>();
        if (request.collectionId() != null) {
            if (grants.existsByItemIdAndSource(id, GrantSource.DIRECT))
                throw bad("Remove direct shares before moving this credential to a team collection");
            collection =
                    collections
                            .findById(request.collectionId())
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.NOT_FOUND, "Collection not found"));
            UUID workspaceId = collection.getWorkspace().getId();
            var membership =
                    members.findByWorkspaceIdAndUserId(workspaceId, CurrentUser.id())
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.FORBIDDEN,
                                                    "Collection access denied"));
            Permissions.require(membership.getRole(), Role.EDITOR);
            expected =
                    members.findByWorkspaceId(workspaceId).stream()
                            .filter(member -> !member.getUser().getId().equals(owner.getId()))
                            .collect(
                                    Collectors.toMap(
                                            member -> member.getUser().getId(),
                                            member ->
                                                    member.getRole() == Role.OWNER
                                                            ? Role.ADMIN
                                                            : member.getRole()));
        } else if (!CurrentUser.id().equals(owner.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Only the owner can move this credential to personal vault");
        }
        Set<UUID> provided = new HashSet<>();
        for (var input : requested) {
            CryptoPayloadValidator.wrappedKey(input.wrappedKey());
            if (!provided.add(input.userId()) || input.role() != expected.get(input.userId()))
                throw bad("Collection roles must match membership");
            var existing = grants.findByItemIdAndUserId(id, input.userId());
            if (existing.isPresent() && existing.get().getSource() == GrantSource.DIRECT)
                throw bad("Remove the direct share before moving to this collection");
        }
        if (!provided.equals(expected.keySet()))
            throw bad("Every collection member needs an encrypted key");
        grants.findByItemId(id).stream()
                .filter(grant -> grant.getSource() == GrantSource.COLLECTION)
                .forEach(grants::delete);
        grants.flush();
        item.setCollection(collection);
        for (var input : requested) {
            var user = users.findById(input.userId()).orElseThrow();
            grants.save(
                    new ItemGrant(
                            item, user, input.wrappedKey(), input.role(), GrantSource.COLLECTION));
        }
        items.flush();
        return one(id);
    }

    @Transactional
    public void delete(UUID id) {
        Permissions.require(access(id, CurrentUser.id()).getRole(), Role.OWNER);
        grants.deleteByItemId(id);
        grants.flush();
        items.deleteById(id);
    }

    public List<GrantResponse> grants(UUID id) {
        Permissions.require(access(id, CurrentUser.id()).getRole(), Role.ADMIN);
        return grants.findByItemId(id).stream()
                .map(
                        grant ->
                                new GrantResponse(
                                        grant.getUser().getId(),
                                        grant.getUser().getEmail(),
                                        grant.getUser().getPublicKey(),
                                        grant.getWrappedKey(),
                                        "RSA",
                                        grant.getRole(),
                                        grant.getSource()))
                .toList();
    }

    @Transactional
    public void share(UUID id, ShareRequest request) {
        Permissions.require(access(id, CurrentUser.id()).getRole(), Role.ADMIN);
        Permissions.assignable(request.role());
        CryptoPayloadValidator.wrappedKey(request.wrappedKey());
        var item =
                items.findById(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Credential not found"));
        if (item.getCollection() != null)
            throw bad("Direct sharing is unavailable for team credentials; manage access from the team");
        var target =
                users.findByEmail(AuthService.normalizeEmail(request.email()))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Registered user not found"));
        if (grants.existsByItemIdAndUserId(id, target.getId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This user already has access");
        grants.save(
                new ItemGrant(
                        item,
                        target,
                        request.wrappedKey(),
                        request.role(),
                        GrantSource.DIRECT));
    }

    @Transactional
    public void changeRole(UUID id, UUID userId, RoleRequest request) {
        Permissions.require(access(id, CurrentUser.id()).getRole(), Role.ADMIN);
        Permissions.assignable(request.role());
        var grant = access(id, userId);
        if (grant.getSource() != GrantSource.DIRECT)
            throw bad("Change collection roles from the team page");
        grant.setRole(request.role());
    }

    @Transactional
    public ItemResponse rekey(UUID id, RekeyRequest request) {
        Permissions.require(access(id, CurrentUser.id()).getRole(), Role.ADMIN);
        if (request.removeUserId() != null
                && access(id, request.removeUserId()).getSource() != GrantSource.DIRECT)
            throw bad("Only a direct share can be removed here");
        rekeyInternal(id, request, request.removeUserId());
        return CurrentUser.id().equals(request.removeUserId()) ? null : one(id);
    }

    /** Replaces the item key without allowing the client to change server-side permissions. */
    @Transactional
    public void rekeyInternal(UUID id, RekeyRequest request, UUID removedUser) {
        CryptoPayloadValidator.cipher(request.ciphertext(), request.nonce());
        var item = locked(id, request.version());
        var existing = grants.findByItemId(id);
        var expected =
                existing.stream()
                        .filter(grant -> !grant.getUser().getId().equals(removedUser))
                        .collect(
                                Collectors.toMap(grant -> grant.getUser().getId(), grant -> grant));
        if (removedUser != null && item.getOwner().getId().equals(removedUser))
            throw bad("Delete this member's owned credentials before removing them");
        Set<UUID> provided = new HashSet<>();
        for (var input : request.grants()) {
            CryptoPayloadValidator.wrappedKey(input.wrappedKey());
            var previous = expected.get(input.userId());
            if (!provided.add(input.userId())
                    || previous == null
                    || input.role() != previous.getRole()
                    || input.source() != previous.getSource())
                throw bad("Key rotation cannot change permissions");
        }
        if (!provided.equals(expected.keySet()))
            throw bad("Include every remaining user's encrypted key");
        item.setCiphertext(request.ciphertext());
        item.setNonce(request.nonce());
        item.setUpdatedAt(Instant.now());
        // Update existing rows in place; remove only the revoked user's grant.
        for (var input : request.grants())
            expected.get(input.userId()).setWrappedKey(input.wrappedKey());
        existing.stream()
                .filter(grant -> grant.getUser().getId().equals(removedUser))
                .forEach(grants::delete);
        items.flush();
    }

    private VaultItem locked(UUID id, int version) {
        var item =
                items.findLockedById(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Credential not found"));
        if (item.getVersion() != version)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Credential changed; refresh before saving");
        return item;
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
