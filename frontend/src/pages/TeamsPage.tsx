import { useEffect, useState } from "react";
import type { VaultModel } from "../hooks/useVault";
import { rank } from "../utils/permissions";
import type { Role } from "../../../shared/types";
import { Icon } from "../components/Icon";

export function TeamsPage({ model }: { model: VaultModel }) {
  const {
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
    busy,
    currentTeam,
    workspaces,
    createTeam,
    createCollection,
    updateTeamName,
    removeTeam,
    updateCollectionName,
    removeCollection,
    addMember,
    removeMember,
    changeMemberRole,
    entries,
    openEditor,
  } = model;
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [teamQuery, setTeamQuery] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState<"ALL" | Role>("ALL");
  const [teamSort, setTeamSort] = useState<"NAME" | "ROLE">("NAME");
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(10);
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<"ALL" | "WITH_CREDENTIALS" | "EMPTY">("ALL");
  const [collectionSort, setCollectionSort] = useState<"NAME" | "CREDENTIALS">("NAME");
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionPageSize, setCollectionPageSize] = useState(10);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<"ALL" | Role>("ALL");
  const [memberSort, setMemberSort] = useState<"NAME" | "EMAIL">("NAME");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [credentialQuery, setCredentialQuery] = useState("");
  const [credentialCategory, setCredentialCategory] = useState("ALL");
  const [credentialSort, setCredentialSort] = useState<"TITLE" | "USERNAME">("TITLE");
  const [credentialPage, setCredentialPage] = useState(1);
  const [credentialPageSize, setCredentialPageSize] = useState(10);
  const selectedCollection = currentTeam?.collections.find(
    (collection) => collection.id === collectionViewId,
  );
  const collectionEntries = selectedCollection
    ? entries.filter((entry) => entry.item.collectionId === selectedCollection.id)
    : [];
  const visibleTeams = workspaces
    .filter((team) => {
      const needle = teamQuery.trim().toLocaleLowerCase();
      const matchesQuery = !needle || team.name.toLocaleLowerCase().includes(needle);
      const matchesRole = teamRoleFilter === "ALL" || team.role === teamRoleFilter;
      return matchesQuery && matchesRole;
    })
    .sort((left, right) => {
      const leftValue = teamSort === "ROLE" ? left.role : left.name;
      const rightValue = teamSort === "ROLE" ? right.role : right.name;
      return leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });
    });
  const teamPageCount = Math.max(1, Math.ceil(visibleTeams.length / teamPageSize));
  const safeTeamPage = Math.min(teamPage, teamPageCount);
  const pagedTeams = visibleTeams.slice(
    (safeTeamPage - 1) * teamPageSize,
    safeTeamPage * teamPageSize,
  );
  const teamRangeStart = visibleTeams.length ? (safeTeamPage - 1) * teamPageSize + 1 : 0;
  const teamRangeEnd = Math.min(safeTeamPage * teamPageSize, visibleTeams.length);
  const visibleCollections = (currentTeam?.collections || [])
    .filter((collection) => {
      const needle = collectionQuery.trim().toLocaleLowerCase();
      const credentials = entries.filter((entry) => entry.item.collectionId === collection.id).length;
      const matchesQuery = !needle || collection.name.toLocaleLowerCase().includes(needle);
      const matchesFilter = collectionFilter === "ALL"
        || (collectionFilter === "WITH_CREDENTIALS" && credentials > 0)
        || (collectionFilter === "EMPTY" && credentials === 0);
      return matchesQuery && matchesFilter;
    })
    .sort((left, right) => {
      if (collectionSort === "CREDENTIALS") {
        const leftCount = entries.filter((entry) => entry.item.collectionId === left.id).length;
        const rightCount = entries.filter((entry) => entry.item.collectionId === right.id).length;
        return rightCount - leftCount || left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });
  const collectionPageCount = Math.max(1, Math.ceil(visibleCollections.length / collectionPageSize));
  const safeCollectionPage = Math.min(collectionPage, collectionPageCount);
  const pagedCollections = visibleCollections.slice(
    (safeCollectionPage - 1) * collectionPageSize,
    safeCollectionPage * collectionPageSize,
  );
  const collectionRangeStart = visibleCollections.length ? (safeCollectionPage - 1) * collectionPageSize + 1 : 0;
  const collectionRangeEnd = Math.min(safeCollectionPage * collectionPageSize, visibleCollections.length);
  const visibleMembers = (currentTeam?.members || [])
    .filter((member) => {
      const needle = memberQuery.trim().toLocaleLowerCase();
      const displayName = `${member.firstName} ${member.lastName}`.trim().toLocaleLowerCase();
      const matchesQuery = !needle || displayName.includes(needle) || member.email.toLocaleLowerCase().includes(needle);
      const matchesRole = memberRoleFilter === "ALL" || member.role === memberRoleFilter;
      return matchesQuery && matchesRole;
    })
    .sort((left, right) => {
      const leftValue = memberSort === "EMAIL"
        ? left.email
        : `${left.firstName} ${left.lastName}`.trim();
      const rightValue = memberSort === "EMAIL"
        ? right.email
        : `${right.firstName} ${right.lastName}`.trim();
      return leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });
    });
  const memberPageCount = Math.max(1, Math.ceil(visibleMembers.length / memberPageSize));
  const safeMemberPage = Math.min(memberPage, memberPageCount);
  const pagedMembers = visibleMembers.slice(
    (safeMemberPage - 1) * memberPageSize,
    safeMemberPage * memberPageSize,
  );
  const memberRangeStart = visibleMembers.length
    ? (safeMemberPage - 1) * memberPageSize + 1
    : 0;
  const memberRangeEnd = Math.min(safeMemberPage * memberPageSize, visibleMembers.length);
  const collectionCategories = [...new Set(
    collectionEntries.map((entry) => entry.record.category).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));
  const visibleCredentials = collectionEntries
    .filter((entry) => {
      const needle = credentialQuery.trim().toLocaleLowerCase();
      const matchesQuery = [entry.record.title, entry.record.username, entry.record.url]
        .some((value) => value.toLocaleLowerCase().includes(needle));
      const matchesCategory = credentialCategory === "ALL" || entry.record.category === credentialCategory;
      return matchesQuery && matchesCategory;
    })
    .sort((left, right) => {
      const leftValue = credentialSort === "USERNAME" ? left.record.username : left.record.title;
      const rightValue = credentialSort === "USERNAME" ? right.record.username : right.record.title;
      return leftValue.localeCompare(rightValue, undefined, { sensitivity: "base", numeric: true });
    });
  const credentialPageCount = Math.max(1, Math.ceil(visibleCredentials.length / credentialPageSize));
  const safeCredentialPage = Math.min(credentialPage, credentialPageCount);
  const pagedCredentials = visibleCredentials.slice(
    (safeCredentialPage - 1) * credentialPageSize,
    safeCredentialPage * credentialPageSize,
  );
  const credentialRangeStart = visibleCredentials.length
    ? (safeCredentialPage - 1) * credentialPageSize + 1
    : 0;
  const credentialRangeEnd = Math.min(safeCredentialPage * credentialPageSize, visibleCredentials.length);
  useEffect(() => {
    setTeamPage(1);
  }, [teamQuery, teamRoleFilter, teamSort, teamPageSize]);
  useEffect(() => {
    setCollectionPage(1);
  }, [teamId, collectionQuery, collectionFilter, collectionSort, collectionPageSize]);
  useEffect(() => {
    setMemberPage(1);
  }, [teamId, memberQuery, memberRoleFilter, memberSort, memberPageSize]);
  useEffect(() => {
    setCredentialPage(1);
  }, [collectionViewId, credentialQuery, credentialCategory, credentialSort, credentialPageSize]);
  function renameTeam() {
    if (!currentTeam) return;
    const name = window.prompt("Team name", currentTeam.name);
    if (name?.trim()) void updateTeamName(currentTeam.id, name);
  }
  function renameCollection(collectionId: string, currentName: string) {
    if (!currentTeam) return;
    const name = window.prompt("Collection name", currentName);
    if (name?.trim()) void updateCollectionName(currentTeam.id, collectionId, name);
  }
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <h1>Teams & collections</h1>
        </div>
      </div>
      <div className="two-col team-layout">
        <section className="card">
          <h2>Your teams</h2>
          <form onSubmit={createTeam} className="inline-form">
            <input
              placeholder="New team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <button disabled={busy}>Create</button>
          </form>
          <div className="team-toolbar">
            <input
              type="search"
              aria-label="Search teams"
              placeholder="Search teams…"
              value={teamQuery}
              onChange={(event) => setTeamQuery(event.target.value)}
            />
            <select
              aria-label="Filter teams by role"
              value={teamRoleFilter}
              onChange={(event) => setTeamRoleFilter(event.target.value as "ALL" | Role)}
            >
              <option value="ALL">All roles</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <select
              aria-label="Sort teams"
              value={teamSort}
              onChange={(event) => setTeamSort(event.target.value as "NAME" | "ROLE")}
            >
              <option value="NAME">Name A–Z</option>
              <option value="ROLE">Role</option>
            </select>
            <label className="team-page-size" title="Rows per page">
              <select
                aria-label="Teams per page"
                value={teamPageSize}
                onChange={(event) => setTeamPageSize(Number(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
          <div className="team-summary">
            {visibleTeams.length
              ? `${teamRangeStart}–${teamRangeEnd} of ${visibleTeams.length} teams`
              : "No matching teams"}
          </div>
          <div className="team-list">
            {pagedTeams.map((team) => (
              <button
                key={team.id}
                className={teamId === team.id ? "selected" : ""}
                onClick={() => setTeamId(team.id)}
              >
                {team.name}
                <small>{team.role}</small>
              </button>
            ))}
            {visibleTeams.length === 0 && <p className="muted small">No teams found.</p>}
          </div>
          {visibleTeams.length > teamPageSize && (
            <div className="pagination" aria-label="Teams pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={safeTeamPage === 1}
                onClick={() => setTeamPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>Page {safeTeamPage} of {teamPageCount}</span>
              <button
                type="button"
                className="secondary-button"
                disabled={safeTeamPage === teamPageCount}
                onClick={() => setTeamPage((page) => Math.min(teamPageCount, page + 1))}
              >
                Next
              </button>
            </div>
          )}
        </section>
        <section className="card">
          {currentTeam ? (
            <>
              <div className="team-heading">
                <div>
                  <h2>{currentTeam.name}</h2>
                  <p className="muted">Your role: {currentTeam.role}</p>
                </div>
                {rank(currentTeam.role) >= 3 && (
                  <div className="actions">
                    <button
                      type="button"
                      className="icon-button subtle"
                      aria-label="Rename team"
                      title="Rename team"
                      disabled={busy}
                      onClick={renameTeam}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button subtle danger-icon"
                      aria-label="Remove team"
                      title="Remove team"
                      disabled={busy}
                      onClick={() => void removeTeam(currentTeam.id)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                )}
              </div>
              <h3>Collections</h3>
              <div className="collection-list-toolbar">
                <input
                  type="search"
                  aria-label="Search collections"
                  placeholder="Search collections…"
                  value={collectionQuery}
                  onChange={(event) => setCollectionQuery(event.target.value)}
                />
                <select
                  aria-label="Filter collections"
                  value={collectionFilter}
                  onChange={(event) => setCollectionFilter(event.target.value as "ALL" | "WITH_CREDENTIALS" | "EMPTY")}
                >
                  <option value="ALL">All collections</option>
                  <option value="WITH_CREDENTIALS">With credentials</option>
                  <option value="EMPTY">Empty collections</option>
                </select>
                <select
                  aria-label="Sort collections"
                  value={collectionSort}
                  onChange={(event) => setCollectionSort(event.target.value as "NAME" | "CREDENTIALS")}
                >
                  <option value="NAME">Name A–Z</option>
                  <option value="CREDENTIALS">Most credentials</option>
                </select>
                <label className="collection-list-page-size" title="Rows per page">
                  <select
                    aria-label="Collections per page"
                    value={collectionPageSize}
                    onChange={(event) => setCollectionPageSize(Number(event.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <div className="collection-list-summary">
                {visibleCollections.length
                  ? `${collectionRangeStart}–${collectionRangeEnd} of ${visibleCollections.length} collections`
                  : "No matching collections"}
              </div>
              {pagedCollections.map((collection) => (
                <div key={collection.id} className="simple-row collection-row">
                  <button
                    type="button"
                    className="collection-select"
                    onClick={() => {
                      setCollectionViewId(collection.id);
                      setVisiblePasswords({});
                      setCredentialQuery("");
                      setCredentialCategory("ALL");
                      setCredentialSort("TITLE");
                      setCredentialPage(1);
                    }}
                  >
                    <strong>{collection.name}</strong>
                    <small>
                      {entries.filter(
                        (entry) => entry.item.collectionId === collection.id,
                      ).length} {" "}credential(s)
                    </small>
                  </button>
                  {rank(currentTeam.role) >= 3 && (
                    <div className="actions">
                      <button
                        type="button"
                        className="icon-button subtle"
                        aria-label={`Rename ${collection.name}`}
                        title="Rename collection"
                        disabled={busy}
                        onClick={() =>
                          renameCollection(collection.id, collection.name)
                        }
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button subtle danger-icon"
                        aria-label={`Remove ${collection.name}`}
                        title="Remove collection"
                        disabled={busy}
                        onClick={() =>
                          void removeCollection(currentTeam.id, collection.id)
                        }
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {visibleCollections.length === 0 && currentTeam.collections.length > 0 && <p className="muted small">No collections found.</p>}
              {visibleCollections.length > collectionPageSize && (
                <div className="pagination" aria-label="Collections pagination">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={safeCollectionPage === 1}
                    onClick={() => setCollectionPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <span>Page {safeCollectionPage} of {collectionPageCount}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={safeCollectionPage === collectionPageCount}
                    onClick={() => setCollectionPage((page) => Math.min(collectionPageCount, page + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
              {rank(currentTeam.role) >= 3 && (
                <form onSubmit={createCollection} className="inline-form">
                  <input
                    placeholder="Collection name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    required
                  />
                  <button disabled={busy}>Add folder</button>
                </form>
              )}
              <h3>Members</h3>
              {currentTeam.members.length > 0 && (
                <>
                  <div className="member-toolbar">
                    <input
                      type="search"
                      className="member-search"
                      aria-label="Search members"
                      placeholder="Search by name or email…"
                      value={memberQuery}
                      onChange={(event) => setMemberQuery(event.target.value)}
                    />
                    <select
                      aria-label="Filter members by role"
                      value={memberRoleFilter}
                      onChange={(event) => setMemberRoleFilter(event.target.value as "ALL" | Role)}
                    >
                      <option value="ALL">All roles</option>
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <select
                      aria-label="Sort team members"
                      value={memberSort}
                      onChange={(event) => setMemberSort(event.target.value as "NAME" | "EMAIL")}
                    >
                      <option value="NAME">Name A–Z</option>
                      <option value="EMAIL">Email A–Z</option>
                    </select>
                    <label className="member-page-size" title="Rows per page">
                      <select
                        aria-label="Members per page"
                        value={memberPageSize}
                        onChange={(event) => setMemberPageSize(Number(event.target.value))}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>
                  <div className="member-summary">
                    {visibleMembers.length
                      ? `${memberRangeStart}–${memberRangeEnd} of ${visibleMembers.length} members`
                      : "No matching members"}
                  </div>
                </>
              )}
              {pagedMembers.map((member) => (
                <div key={member.id} className="simple-row member-row">
                  <div className="member-identity">
                    <span className="member-avatar" aria-hidden="true">{`${member.firstName.slice(0, 1)}${member.lastName.slice(0, 1)}`.toUpperCase()}</span>
                    <span className="member-email" title={member.email}><strong>{member.firstName} {member.lastName}</strong><small>{member.email}</small></span>
                  </div>
                  <div className="member-controls">
                  {rank(currentTeam.role) >= 3 && member.role !== "OWNER" ? (
                    <select
                      aria-label={`Role for ${member.email}`}
                      value={member.role}
                      disabled={busy}
                      onChange={(e) =>
                        changeMemberRole(member.id, e.target.value as Role)
                      }
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <strong className="member-role-label">{member.role}</strong>
                  )}
                  {rank(currentTeam.role) >= 3 && member.role !== "OWNER" && (
                    <button
                      type="button"
                      className="icon-button subtle danger-icon"
                      aria-label={`Remove ${member.email} from team`}
                      title="Remove member"
                      disabled={busy}
                      onClick={() => removeMember(member.id)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                  </div>
                </div>
              ))}
              {visibleMembers.length > memberPageSize && (
                <div className="pagination" aria-label="Members pagination">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={safeMemberPage === 1}
                    onClick={() => setMemberPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <span>Page {safeMemberPage} of {memberPageCount}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={safeMemberPage === memberPageCount}
                    onClick={() => setMemberPage((page) => Math.min(memberPageCount, page + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
              {visibleMembers.length === 0 && currentTeam.members.length > 0 && <p className="muted small">No members found.</p>}
              {rank(currentTeam.role) >= 3 && (
                <form onSubmit={addMember} className="inline-form member-add-form">
                  <div className="share-user-picker">
                    <input
                      type="email"
                      placeholder="Search registered users"
                      aria-label="Search users to add to team"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      required
                      autoComplete="off"
                    />
                    {memberUsers.length > 0 && (
                      <div
                        className="user-suggestions"
                        role="listbox"
                        aria-label="Matching team users"
                      >
                        {memberUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            role="option"
                            onClick={() => setMemberEmail(user.email)}
                          >
                            {user.firstName} {user.lastName} · {user.email}
                          </button>
                        ))}
                      </div>
                    )}
                    {memberEmail.trim().length >= 2 &&
                      memberUsers.length === 0 && (
                        <p className="user-search-empty" role="status">
                          No user found
                        </p>
                      )}
                  </div>
                  <select
                    aria-label="Role for new team member"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as Role)}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button type="submit" disabled={busy}>Add member</button>
                </form>
              )}
            </>
          ) : (
            <p className="muted">
              Select a team to manage its members and folders.
            </p>
          )}
        </section>
      </div>
      {selectedCollection && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-dialog-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="collection-dialog-title">
                  {currentTeam?.name} / {selectedCollection.name}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button subtle"
                aria-label="Close collection details"
                title="Close"
                onClick={() => setCollectionViewId(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="collection-toolbar">
              <input
                type="search"
                aria-label="Search collection credentials"
                placeholder="Search title, username or website…"
                value={credentialQuery}
                onChange={(event) => setCredentialQuery(event.target.value)}
              />
              <select
                aria-label="Filter collection by category"
                value={credentialCategory}
                onChange={(event) => setCredentialCategory(event.target.value)}
              >
                <option value="ALL">All categories</option>
                {collectionCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select
                aria-label="Sort collection credentials"
                value={credentialSort}
                onChange={(event) => setCredentialSort(event.target.value as "TITLE" | "USERNAME")}
              >
                <option value="TITLE">Name A–Z</option>
                <option value="USERNAME">Username A–Z</option>
              </select>
              <label className="collection-page-size" title="Rows per page">
                <select
                  aria-label="Collection rows per page"
                  value={credentialPageSize}
                  onChange={(event) => setCredentialPageSize(Number(event.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <div className="collection-summary" role="status">
              {credentialRangeStart}–{credentialRangeEnd} of {visibleCredentials.length} {visibleCredentials.length === 1 ? "credential" : "credentials"}
            </div>
            {visibleCredentials.length === 0 ? (
              <p className="muted">{credentialQuery ? "No matching credentials." : "No credentials saved in this collection."}</p>
            ) : (
              <div className="collection-credentials">
                {pagedCredentials.map((entry) => {
                  const visible = !!visiblePasswords[entry.item.id];
                  return (
                    <div className="collection-credential" key={entry.item.id}>
                      <div>
                        <strong>{entry.record.title}</strong>
                        <small>
                          {entry.record.username} · {entry.record.url}
                        </small>
                        <code>
                          {visible ? entry.record.password : "••••••••"}
                        </code>
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          className="icon-button subtle"
                          aria-label={visible ? "Hide password" : "Show password"}
                          title={visible ? "Hide password" : "Show password"}
                          onClick={() =>
                            setVisiblePasswords((current) => ({
                              ...current,
                              [entry.item.id]: !visible,
                            }))
                          }
                        >
                          <Icon name={visible ? "eyeOff" : "eye"} size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button subtle"
                          aria-label="Copy password"
                          title="Copy password"
                          onClick={() =>
                            void navigator.clipboard.writeText(
                              entry.record.password,
                            )
                          }
                        >
                          <Icon name="copy" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCollectionViewId(null);
                            openEditor(entry, "view");
                          }}
                        >
                          <Icon name="vault" size={15} /> Open in vault
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {visibleCredentials.length > 0 && (
              <nav className="pagination" aria-label="Collection credential pages">
                <span>Page {safeCredentialPage} of {credentialPageCount}</span>
                <div>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={safeCredentialPage === 1}
                    onClick={() => setCredentialPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={safeCredentialPage === credentialPageCount}
                    onClick={() => setCredentialPage((page) => Math.min(credentialPageCount, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
