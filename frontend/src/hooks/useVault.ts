import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCrypto,
  decryptRecord,
  encryptRecord,
  itemKey,
  newItem,
  rekeyItem,
  unlock,
  wrapForUser,
  type Unlocked,
} from "../../../shared/crypto";
import {
  exportRecords,
  importRecords,
  totp,
  validateVaultRecord,
} from "../../../shared/helpers";
import type {
  CryptoInfo,
  Grant,
  Item,
  Role,
  Session,
  VaultRecord,
  WorkspaceDetails,
} from "../../../shared/types";
import { authService } from "../services/authService";
import { vaultService } from "../services/vaultService";
import { workspaceService } from "../services/workspaceService";
import { useAutoLock } from "./useAutoLock";
import { rank } from "../utils/permissions";
type Loaded = { item: Item; record: VaultRecord };
const emptyRecord = (): VaultRecord => ({
  title: "",
  username: "",
  password: "",
  url: "",
  category: "Personal",
  notes: "",
  totpSecret: "",
});
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";
export function useVault() {
  const epoch = useRef(0);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [ownershipFilter, setOwnershipFilter] = useState<
    "ALL" | "OWNED" | "SHARED"
  >("ALL");
  const [session, setSession] = useState<Session | null>(null);
  const [cryptoInfo, setCryptoInfo] = useState<CryptoInfo | null>(null);
  const [keys, setKeys] = useState<Unlocked | null>(null);
  const activeKeys = useRef<Unlocked | null>(keys);
  activeKeys.current = keys;
  const [entries, setEntries] = useState<Loaded[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceDetails[]>([]);
  const [tab, setTab] = useState<"vault" | "teams" | "transfer">("vault");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirmation, setAccountPasswordConfirmation] =
    useState("");
  const [master, setMaster] = useState("");
  const [masterConfirmation, setMasterConfirmation] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<VaultRecord>(emptyRecord());
  const [collectionId, setCollectionId] = useState("");
  const [query, setQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareUsers, setShareUsers] = useState<
    { id: string; firstName: string; lastName: string; email: string; publicKey: string }[]
  >([]);
  const [shareRole, setShareRole] = useState<Role>("VIEWER");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [teamName, setTeamName] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [collectionViewId, setCollectionViewId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberUsers, setMemberUsers] = useState<
    { id: string; firstName: string; lastName: string; email: string; publicKey: string }[]
  >([]);
  const [memberRole, setMemberRole] = useState<Role>("VIEWER");
  const [importKind, setImportKind] = useState<
    | "chrome"
    | "onepassword"
    | "bitwarden-csv"
    | "bitwarden-json"
    | "teamvault-json"
  >("chrome");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  const selected = entries.find((entry) => entry.item.id === selectedId);
  const currentTeam = workspaces.find((workspace) => workspace.id === teamId);
  const filtered = useMemo(
    () => {
      const needle = query.trim().toLocaleLowerCase();
      return entries.filter((entry) => {
        const { record } = entry;
        return (
          [record.title, record.url, record.username, record.category, entry.item.ownerEmail].some((value) =>
            value.toLocaleLowerCase().includes(needle),
          ) &&
          (categoryFilter === "All" || record.category === categoryFilter) &&
          (ownershipFilter === "ALL" ||
            (ownershipFilter === "OWNED"
              ? entry.item.ownerId === session?.userId
              : entry.item.ownerId !== session?.userId))
        );
      });
    },
    [entries, query, categoryFilter, ownershipFilter, session],
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      let next: Session;
      if (mode === "register") {
        if (firstName.trim().length < 2 || firstName.trim().length > 100)
          throw new Error("First name must be between 2 and 100 characters");
        if (lastName.trim().length < 2 || lastName.trim().length > 100)
          throw new Error("Last name must be between 2 and 100 characters");
        if (accountPassword !== accountPasswordConfirmation)
          throw new Error("Account passwords do not match");
        if (master !== masterConfirmation)
          throw new Error("Master passwords do not match");
        if (accountPassword === master)
          throw new Error("Use different account and master passwords");
        const info = await createCrypto(master);
        next = await authService.register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          accountPassword,
          ...info,
        });
        setCryptoInfo(info);
        setKeys(await unlock(master, info));
      } else {
        next = await authService.login({ email, accountPassword });
        setCryptoInfo(await authService.crypto(next.token));
      }
      setSession(next);
      setFirstName("");
      setLastName("");
      setAccountPassword("");
      setAccountPasswordConfirmation("");
      setMaster("");
      setMasterConfirmation("");
    });
  }
  async function unlockVault(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (!cryptoInfo) throw new Error("Crypto metadata unavailable");
      setKeys(await unlock(master, cryptoInfo));
      setMaster("");
    });
  }
  async function loadAll(
    activeSession: Session,
    unlocked: Unlocked,
  ): Promise<Loaded[]> {
    if (activeKeys.current !== unlocked) return [];
    const activeEpoch = epoch.current;
    const raw = await vaultService.list(activeSession.token);
    const loaded = await Promise.all(
      raw.map(async (item) => ({
        item,
        record: await decryptRecord(item, unlocked),
      })),
    );
    const summary = await workspaceService.list(activeSession.token);
    const details = await Promise.all(
      summary.map((team) =>
        workspaceService.details(activeSession.token, team.id),
      ),
    );
    if (activeEpoch !== epoch.current || activeKeys.current !== unlocked)
      return [];
    setEntries(loaded);
    setWorkspaces(details);
    return loaded;
  }
  useEffect(() => {
    if (session && keys)
      void loadAll(session, keys).catch((caught) => setError(message(caught)));
  }, [session, keys]);
  useEffect(() => {
    if (!selected || rank(selected.item.role) < 3 || !session) {
      setGrants([]);
      return;
    }
    void vaultService
      .grants(session.token, selected.item.id)
      .then(setGrants)
      .catch((caught) => setError(message(caught)));
  }, [selectedId, entries, session]);
  useEffect(() => {
    if (!draft.totpSecret) {
      setCode("");
      return;
    }
    let active = true;
    const tick = () =>
      void totp(draft.totpSecret || "")
        .then((value) => {
          if (active) setCode(value);
        })
        .catch(() => {
          if (active) setCode("Invalid secret");
        });
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [draft.totpSecret]);
  useEffect(() => {
    if (!session || shareEmail.trim().length < 2) {
      setShareUsers([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void authService
        .searchUsers(session.token, shareEmail.trim())
        .then((users) =>
          setShareUsers(users.filter((user) => user.id !== session.userId)),
        )
        .catch(() => setShareUsers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [session, shareEmail]);
  useEffect(() => {
    if (!session || !currentTeam || memberEmail.trim().length < 2) {
      setMemberUsers([]);
      return;
    }
    const existingMemberIds = new Set(
      currentTeam.members.map((member) => member.id),
    );
    const timer = window.setTimeout(() => {
      void authService
        .searchUsers(session.token, memberEmail.trim())
        .then((users) =>
          setMemberUsers(
            users.filter(
              (user) =>
                user.id !== session.userId && !existingMemberIds.has(user.id),
            ),
          ),
        )
        .catch(() => setMemberUsers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [session, currentTeam, memberEmail]);
  function choose(entry: Loaded | null) {
    setSelectedId(entry?.item.id || null);
    setDraft(entry ? { ...entry.record } : emptyRecord());
    setCollectionId(entry?.item.collectionId || "");
    setShowPassword(false);
    setTab("vault");
  }
  function openEditor(entry: Loaded | null, mode: "view" | "edit" = entry ? "view" : "edit") {
    choose(entry);
    setEditorMode(mode);
    setEditorOpen(true);
  }
  function lockVault() {
    activeKeys.current = null;
    epoch.current++;
    setImportFile(null);
    setKeys(null);
    setEntries([]);
    setDraft(emptyRecord());
    setSelectedId(null);
    setCollectionViewId(null);
    setGrants([]);
    setCode("");
    setShowPassword(false);
    setMaster("");
  }
  useAutoLock(!!keys, lockVault);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        lockVault();
        setSession(null);
        setCryptoInfo(null);
        setError("Your session expired. Sign in again.");
      },
      Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [session]);

  async function saveEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !keys || !cryptoInfo) return;
    const editing = !!selected;
    await run(async () => {
      validateVaultRecord(draft);
      if (selected) {
        if (
          collectionId &&
          collectionId !== (selected.item.collectionId || "") &&
          selected.item.hasDirectShares
        ) {
          throw new Error(
            "Cannot move this credential to a team collection while it has direct access. Remove direct access first.",
          );
        }
        const raw = await itemKey(selected.item, keys);
        let version = selected.item.version;
        if (collectionId !== (selected.item.collectionId || "")) {
          const targetTeam = workspaces.find((workspace) =>
            workspace.collections.some(
              (collection) => collection.id === collectionId,
            ),
          );
          const members =
            targetTeam?.members.filter(
              (member) => member.id !== selected.item.ownerId,
            ) || [];
          const collectionGrants = await Promise.all(
            members.map(async (member) => ({
              userId: member.id,
              wrappedKey: await wrapForUser(raw, member.publicKey),
              role: member.role === "OWNER" ? "ADMIN" : member.role,
            })),
          );
          const moved = await vaultService.move(
            session.token,
            selected.item.id,
            {
              collectionId: collectionId || null,
              collectionGrants,
              version,
            },
          );
          version = moved.version;
        }
        const payload = await encryptRecord(draft, raw);
        await vaultService.update(session.token, selected.item.id, {
          ...payload,
          version,
        });
      } else {
        const payload = await newItem(draft, cryptoInfo.publicKey);
        const team = workspaces.find((workspace) =>
          workspace.collections.some(
            (collection) => collection.id === collectionId,
          ),
        );
        const members =
          team?.members.filter((member) => member.id !== session.userId) || [];
        const collectionGrants = await Promise.all(
          members.map(async (member) => ({
            userId: member.id,
            wrappedKey: await wrapForUser(payload.rawKey, member.publicKey),
            role: member.role === "OWNER" ? "ADMIN" : member.role,
          })),
        );
        await vaultService.create(session.token, {
          ciphertext: payload.ciphertext,
          nonce: payload.nonce,
          ownerWrappedKey: payload.ownerWrappedKey,
          collectionId: collectionId || null,
          collectionGrants,
        });
      }
      const loaded = await loadAll(session, keys);
      if (editing) {
        choose(
          loaded.find((entry) => entry.item.id === selected?.item.id) || null,
        );
        setNotice("Credential updated");
      } else {
        choose(null);
        setNotice("Credential saved");
      }
      setEditorOpen(false);
    });
  }
  async function deleteEntry() {
    if (!session || !keys || !selected || !confirm("Delete this credential?"))
      return;
    await run(async () => {
      await vaultService.remove(session.token, selected.item.id);
      await loadAll(session, keys);
      choose(null);
      setEditorOpen(false);
    });
  }
  async function shareEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !keys || !selected) return;
    await run(async () => {
      if (selected.item.collectionId)
        throw new Error(
          "Direct sharing is unavailable for team credentials. Manage access from the Teams page.",
        );
      const target = await authService.lookup(session.token, shareEmail);
      const raw = await itemKey(selected.item, keys);
      await vaultService.share(session.token, selected.item.id, {
        email: shareEmail,
        role: shareRole,
        wrappedKey: await wrapForUser(raw, target.publicKey),
      });
      setShareEmail("");
      setShareUsers([]);
      setGrants(await vaultService.grants(session.token, selected.item.id));
      setNotice("Access shared");
    });
  }
  async function changeGrant(target: Grant, role: Role) {
    if (!session || !selected) return;
    await run(async () => {
      await vaultService.changeRole(
        session.token,
        selected.item.id,
        target.userId,
        role,
      );
      setGrants(await vaultService.grants(session.token, selected.item.id));
      setNotice("Sharing permission updated");
    });
  }
  async function revokeGrant(target: Grant) {
    if (
      !session ||
      !keys ||
      !selected ||
      !confirm(`Remove ${target.email}'s access?`)
    )
      return;
    await run(async () => {
      const remaining = grants.filter(
        (grant) => grant.userId !== target.userId,
      );
      const payload = await rekeyItem(selected.record, remaining);
      await vaultService.rekey(session.token, selected.item.id, {
        ...payload,
        version: selected.item.version,
        removeUserId: target.userId,
      });
      const loaded = await loadAll(session, keys);
      choose(
        loaded.find((entry) => entry.item.id === selected.item.id) || null,
      );
      setNotice("Access removed and item key rotated");
    });
  }
  async function createTeam(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !keys) return;
    await run(async () => {
      const team = await workspaceService.create(session.token, teamName);
      await loadAll(session, keys);
      setTeamId(team.id);
      setTeamName("");
    });
  }
  async function createCollection(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !keys || !teamId) return;
    await run(async () => {
      await workspaceService.createCollection(
        session.token,
        teamId,
        collectionName,
      );
      await loadAll(session, keys);
      setCollectionName("");
    });
  }
  async function updateTeamName(teamIdToUpdate: string, name: string) {
    if (!session || !keys) return;
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Team name is required");
    await run(async () => {
      await workspaceService.update(session.token, teamIdToUpdate, trimmed);
      await loadAll(session, keys);
      setTeamId(teamIdToUpdate);
      setNotice("Team updated");
    });
  }
  async function removeTeam(teamIdToRemove: string) {
    if (
      !session ||
      !keys ||
      !confirm("Remove this team? Delete its collection credentials first.")
    )
      return;
    await run(async () => {
      await workspaceService.remove(session.token, teamIdToRemove);
      await loadAll(session, keys);
      if (teamId === teamIdToRemove) setTeamId("");
      setCollectionViewId(null);
      setNotice("Team removed");
    });
  }
  async function updateCollectionName(
    teamIdToUpdate: string,
    collectionIdToUpdate: string,
    name: string,
  ) {
    if (!session || !keys) return;
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Collection name is required");
    await run(async () => {
      await workspaceService.updateCollection(
        session.token,
        teamIdToUpdate,
        collectionIdToUpdate,
        trimmed,
      );
      await loadAll(session, keys);
      setTeamId(teamIdToUpdate);
      setNotice("Collection updated");
    });
  }
  async function removeCollection(
    teamIdToRemove: string,
    collectionIdToRemove: string,
  ) {
    if (
      !session ||
      !keys ||
      !confirm(
        "Remove this collection? Delete its saved credentials first.",
      )
    )
      return;
    await run(async () => {
      await workspaceService.removeCollection(
        session.token,
        teamIdToRemove,
        collectionIdToRemove,
      );
      await loadAll(session, keys);
      setCollectionViewId(null);
      setTeamId(teamIdToRemove);
      setNotice("Collection removed");
    });
  }
  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !keys || !currentTeam) return;
    await run(async () => {
      const target = await authService.lookup(session.token, memberEmail);
      const teamCollectionIds = new Set(
        currentTeam.collections.map((collection) => collection.id),
      );
      const teamEntries = entries.filter(
        (entry) =>
          entry.item.collectionId &&
          teamCollectionIds.has(entry.item.collectionId),
      );
      const envelopes = await Promise.all(
        teamEntries.map(async (entry) => ({
          itemId: entry.item.id,
          wrappedKey: await wrapForUser(
            await itemKey(entry.item, keys),
            target.publicKey,
          ),
        })),
      );
      await workspaceService.addMember(session.token, currentTeam.id, {
        email: memberEmail,
        role: memberRole,
        envelopes,
      });
      await loadAll(session, keys);
      setMemberEmail("");
      setMemberUsers([]);
      setNotice("Member added");
    });
  }
  async function removeMember(memberId: string) {
    if (
      !session ||
      !keys ||
      !currentTeam ||
      !confirm("Remove this member and rotate shared item keys?")
    )
      return;
    await run(async () => {
      const ids = new Set(
        currentTeam.collections.map((collection) => collection.id),
      );
      const teamEntries = entries.filter(
        (entry) => entry.item.collectionId && ids.has(entry.item.collectionId),
      );
      const rekeys = await Promise.all(
        teamEntries.map(async (entry) => {
          const grants = await vaultService.grants(
            session.token,
            entry.item.id,
          );
          if (
            !grants.some(
              (grant) =>
                grant.userId === memberId && grant.source === "COLLECTION",
            )
          )
            return null;
          const payload = await rekeyItem(
            entry.record,
            grants.filter((grant) => grant.userId !== memberId),
          );
          return {
            itemId: entry.item.id,
            ...payload,
            version: entry.item.version,
          };
        }),
      );
      await workspaceService.removeMember(
        session.token,
        currentTeam.id,
        memberId,
        rekeys.filter((value) => value !== null),
      );
      await loadAll(session, keys);
      setNotice("Member removed; item keys rotated");
    });
  }
  async function importFileNow() {
    if (!session || !keys || !cryptoInfo || !importFile) return;
    await run(async () => {
      if (importFile.size > 2_000_000)
        throw new Error("Import files must be under 2 MB");
      const records = importRecords(await importFile.text(), importKind);
      if (!records.length)
        throw new Error("No login entries found in this file");
      if (records.length > 1000)
        throw new Error("Import up to 1000 entries per file");
      const activeEpoch = epoch.current;
      let imported = 0;
      try {
        for (const record of records) {
          if (activeEpoch !== epoch.current || activeKeys.current !== keys)
            throw new Error("Vault locked; import stopped");
          const payload = await newItem(record, cryptoInfo.publicKey);
          if (activeEpoch !== epoch.current || activeKeys.current !== keys)
            throw new Error("Vault locked; import stopped");
          await vaultService.create(session.token, {
            ciphertext: payload.ciphertext,
            nonce: payload.nonce,
            ownerWrappedKey: payload.ownerWrappedKey,
            collectionId: null,
            collectionGrants: [],
          });
          imported++;
        }
      } catch (caught) {
        await loadAll(session, keys).catch(() => undefined);
        throw new Error(
          `Imported ${imported}/${records.length} credentials. ${message(caught)}`,
        );
      }
      await loadAll(session, keys);
      setImportFile(null);
      setNotice(`Imported ${records.length} credentials`);
    });
  }
  function exportFile(format: "csv" | "json") {
    const records = entries
      .filter(
        (entry) =>
          entry.item.ownerId === session?.userId && !entry.item.collectionId,
      )
      .map((entry) => entry.record);
    const content = exportRecords(records, format);
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === "json" ? "application/json" : "text/csv",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `team-vault-export.${format}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function logout() {
    if (session) await authService.logout(session.token).catch(() => undefined);
    setSession(null);
    lockVault();
    setCryptoInfo(null);
    choose(null);
  }

  async function changeMemberRole(memberId: string, role: Role) {
    if (!session || !keys || !currentTeam) return;
    await run(async () => {
      await workspaceService.changeRole(
        session.token,
        currentTeam.id,
        memberId,
        role,
      );
      await loadAll(session, keys);
      setNotice("Member role updated");
    });
  }

  return {
    session,
    keys,
    tab,
    setTab,
    mode,
    setMode,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    accountPassword,
    setAccountPassword,
    accountPasswordConfirmation,
    setAccountPasswordConfirmation,
    master,
    setMaster,
    masterConfirmation,
    setMasterConfirmation,
    selected,
    selectedId,
    editorOpen,
    setEditorOpen,
    editorMode,
    setEditorMode,
    draft,
    setDraft,
    collectionId,
    setCollectionId,
    query,
    setQuery,
    categoryFilter,
    setCategoryFilter,
    ownershipFilter,
    setOwnershipFilter,
    showPassword,
    setShowPassword,
    shareEmail,
    setShareEmail,
    shareUsers,
    shareRole,
    setShareRole,
    grants,
    teamName,
    setTeamName,
    collectionName,
    setCollectionName,
    teamId,
    setTeamId,
    collectionViewId,
    setCollectionViewId,
    memberEmail,
    setMemberEmail,
    memberUsers,
    memberRole,
    setMemberRole,
    importKind,
    setImportKind,
    importFile,
    setImportFile,
    error,
    setError,
    notice,
    setNotice,
    busy,
    code,
    currentTeam,
    workspaces,
    entries,
    filtered,
    authenticate,
    unlockVault,
    choose,
    openEditor,
    lockVault,
    saveEntry,
    deleteEntry,
    shareEntry,
    changeGrant,
    revokeGrant,
    createTeam,
    createCollection,
    updateTeamName,
    removeTeam,
    updateCollectionName,
    removeCollection,
    addMember,
    removeMember,
    changeMemberRole,
    importFileNow,
    exportFile,
    logout,
  };
}
export type VaultModel = ReturnType<typeof useVault>;
