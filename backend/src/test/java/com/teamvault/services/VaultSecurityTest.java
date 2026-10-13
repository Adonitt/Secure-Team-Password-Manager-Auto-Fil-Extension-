package com.teamvault.services;

import static org.junit.jupiter.api.Assertions.*;

import com.teamvault.dtos.*;
import com.teamvault.entities.*;
import com.teamvault.enums.*;
import com.teamvault.repositories.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:vault-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "spring.flyway.enabled=false"
        })
@Transactional
class VaultSecurityTest {
    @Autowired VaultItemService vault;
    @Autowired WorkspaceService teams;
    @Autowired AppUserRepository users;
    @Autowired ItemGrantRepository grants;
    @Autowired VaultItemRepository items;
    private AppUser owner, guest;
    private ItemResponse item;
    private final String ciphertext = Base64.getEncoder().encodeToString(new byte[32]);
    private final String nonce = Base64.getEncoder().encodeToString(new byte[12]);
    private final String wrapped = Base64.getEncoder().encodeToString(new byte[256]);

    @BeforeEach
    void setup() {
        owner =
                users.save(
                        new AppUser(
                                UUID.randomUUID() + "@example.test",
                                "hash",
                                "salt",
                                "pub",
                                "encrypted"));
        guest =
                users.save(
                        new AppUser(
                                UUID.randomUUID() + "@example.test",
                                "hash",
                                "salt",
                                "pub",
                                "encrypted"));
        as(owner);
        item = vault.create(new CreateItemRequest(ciphertext, nonce, wrapped, null, List.of()));
        vault.share(item.id(), new ShareRequest(guest.getEmail(), wrapped, Role.VIEWER));
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    private void as(AppUser user) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                user.getId().toString(), null, List.of()));
    }

    private void denied(int code, Runnable action) {
        assertEquals(
                code,
                assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }

    @Test
    void viewerCannotEditDeleteOrReshare() {
        as(guest);
        assertEquals(Role.VIEWER, vault.one(item.id()).role());
        denied(
                403,
                () ->
                        vault.update(
                                item.id(),
                                new UpdateItemRequest(ciphertext, nonce, item.version())));
        denied(403, () -> vault.delete(item.id()));
        denied(403, () -> vault.grants(item.id()));
        denied(
                403,
                () ->
                        vault.share(
                                item.id(),
                                new ShareRequest(owner.getEmail(), wrapped, Role.ADMIN)));
    }

    @Test
    void editorCanEditButCannotReshareAndStaleWritesFail() {
        vault.changeRole(item.id(), guest.getId(), new RoleRequest(Role.EDITOR));
        as(guest);
        var updated =
                vault.update(item.id(), new UpdateItemRequest(ciphertext, nonce, item.version()));
        assertEquals(item.version() + 1, updated.version());
        denied(
                409,
                () ->
                        vault.update(
                                item.id(),
                                new UpdateItemRequest(ciphertext, nonce, item.version())));
        denied(403, () -> vault.grants(item.id()));
    }

    @Test
    void rotationCannotEscalateRolesOrDropTheOwner() {
        denied(
                400,
                () ->
                        vault.rekey(
                                item.id(),
                                new RekeyRequest(
                                        ciphertext,
                                        nonce,
                                        item.version(),
                                        List.of(
                                                new RekeyGrant(
                                                        owner.getId(),
                                                        wrapped,
                                                        Role.OWNER,
                                                        GrantSource.OWNER),
                                                new RekeyGrant(
                                                        guest.getId(),
                                                        wrapped,
                                                        Role.ADMIN,
                                                        GrantSource.DIRECT)),
                                        null)));
        assertEquals(
                Role.VIEWER,
                grants.findByItemIdAndUserId(item.id(), guest.getId()).orElseThrow().getRole());
        denied(
                400,
                () ->
                        vault.rekey(
                                item.id(),
                                new RekeyRequest(
                                        ciphertext,
                                        nonce,
                                        item.version(),
                                        List.of(
                                                new RekeyGrant(
                                                        guest.getId(),
                                                        wrapped,
                                                        Role.VIEWER,
                                                        GrantSource.DIRECT)),
                                        owner.getId())));
    }

    @Test
    void revocationRemovesFutureServerAccess() {
        var updated =
                vault.rekey(
                        item.id(),
                        new RekeyRequest(
                                ciphertext,
                                nonce,
                                item.version(),
                                List.of(
                                        new RekeyGrant(
                                                owner.getId(),
                                                wrapped,
                                                Role.OWNER,
                                                GrantSource.OWNER)),
                                guest.getId()));
        assertEquals(item.version() + 1, updated.version());
        as(guest);
        assertTrue(vault.list().isEmpty());
        denied(404, () -> vault.one(item.id()));
    }

    @Test
    void collectionRequestCannotPromoteAViewer() {
        var team = teams.create(new NameRequest("Security test"));
        var folder = teams.createCollection(team.id(), new NameRequest("Shared"));
        teams.addMember(team.id(), new AddMemberRequest(guest.getEmail(), Role.VIEWER, List.of()));
        long before = items.count();
        denied(
                400,
                () ->
                        vault.create(
                                new CreateItemRequest(
                                        ciphertext,
                                        nonce,
                                        wrapped,
                                        folder.id(),
                                        List.of(
                                                new GrantInput(
                                                        guest.getId(), wrapped, Role.ADMIN)))));
        assertEquals(before, items.count());
    }

    @Test
    void teamCredentialsCannotAlsoUseDirectShares() {
        var team = teams.create(new NameRequest("Team sharing"));
        var folder = teams.createCollection(team.id(), new NameRequest("Shared"));
        teams.addMember(team.id(), new AddMemberRequest(guest.getEmail(), Role.VIEWER, List.of()));
        var teamItem =
                vault.create(
                        new CreateItemRequest(
                                ciphertext,
                                nonce,
                                wrapped,
                                folder.id(),
                                List.of(new GrantInput(guest.getId(), wrapped, Role.VIEWER))));

        denied(
                400,
                () ->
                        vault.share(
                                teamItem.id(),
                                new ShareRequest(guest.getEmail(), wrapped, Role.VIEWER)));
    }
}
