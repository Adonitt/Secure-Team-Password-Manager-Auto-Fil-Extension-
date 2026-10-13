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
  const [collectionQuery, setCollectionQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [credentialQuery, setCredentialQuery] = useState("");
  const selectedCollection = currentTeam?.collections.find(
    (collection) => collection.id === collectionViewId,
  );
  const collectionEntries = selectedCollection
    ? entries.filter((entry) => entry.item.collectionId === selectedCollection.id)
    : [];
  const visibleTeams = workspaces.filter((team) => team.name.toLocaleLowerCase().includes(teamQuery.trim().toLocaleLowerCase()));
  const visibleCollections = currentTeam?.collections.filter((collection) => collection.name.toLocaleLowerCase().includes(collectionQuery.trim().toLocaleLowerCase())) || [];
  const visibleMembers = currentTeam?.members.filter((member) => member.email.toLocaleLowerCase().includes(memberQuery.trim().toLocaleLowerCase())) || [];
  const membersPerPage = 5;
  const memberPageCount = Math.max(1, Math.ceil(visibleMembers.length / membersPerPage));
  const safeMemberPage = Math.min(memberPage, memberPageCount);
  const pagedMembers = visibleMembers.slice(
    (safeMemberPage - 1) * membersPerPage,
    safeMemberPage * membersPerPage,
  );
  const visibleCredentials = collectionEntries.filter((entry) =>
    [entry.record.title, entry.record.username, entry.record.url].some((value) => value.toLocaleLowerCase().includes(credentialQuery.trim().toLocaleLowerCase())));
  useEffect(() => {
    setMemberPage(1);
  }, [teamId]);
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
          <input
            type="search"
            aria-label="Search teams"
            placeholder="Search teams…"
            value={teamQuery}
            onChange={(event) => setTeamQuery(event.target.value)}
          />
          <div className="team-list">
            {visibleTeams.map((team) => (
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
              {currentTeam.collections.length > 6 && <input type="search" aria-label="Search collections" placeholder="Search collections…" value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} />}
              {visibleCollections.map((collection) => (
                <div key={collection.id} className="simple-row collection-row">
                  <button
                    type="button"
                    className="collection-select"
                    onClick={() => {
                      setCollectionViewId(collection.id);
                      setVisiblePasswords({});
                      setCredentialQuery("");
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
                <input
                  type="search"
                  aria-label="Search members"
                  placeholder="Search members…"
                  value={memberQuery}
                  onChange={(event) => {
                    setMemberQuery(event.target.value);
                    setMemberPage(1);
                  }}
                />
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
              {visibleMembers.length > membersPerPage && (
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
            {collectionEntries.length > 8 && <input type="search" aria-label="Search collection credentials" placeholder="Search credentials in this collection…" value={credentialQuery} onChange={(event) => setCredentialQuery(event.target.value)} />}
            {visibleCredentials.length === 0 ? (
              <p className="muted">{credentialQuery ? "No matching credentials." : "No credentials saved in this collection."}</p>
            ) : (
              <div className="collection-credentials">
                {visibleCredentials.map((entry) => {
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
          </section>
        </div>
      )}
    </main>
  );
}
