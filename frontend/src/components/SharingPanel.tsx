import type { VaultModel } from "../hooks/useVault";
import { useEffect, useState } from "react";
import type { Role } from "../../../shared/types";
import { Icon } from "./Icon";

export function SharingPanel({ model }: { model: VaultModel }) {
  const {
    shareEmail,
    setShareEmail,
    shareUsers,
    shareRole,
    setShareRole,
    grants,
    busy,
    shareEntry,
    changeGrant,
    revokeGrant,
  } = model;
  const [grantQuery, setGrantQuery] = useState("");
  const [grantPage, setGrantPage] = useState(1);
  const [grantSourceFilter, setGrantSourceFilter] = useState<"ALL" | "OWNER" | "DIRECT" | "COLLECTION">("ALL");
  const [grantPageSize, setGrantPageSize] = useState(10);
  const isTeamCredential = !!model.selected?.item.collectionId;
  const visibleGrants = grants
    .filter((grant) => {
      const matchesQuery = grant.email.toLocaleLowerCase().includes(grantQuery.trim().toLocaleLowerCase());
      const matchesSource = grantSourceFilter === "ALL" || grant.source === grantSourceFilter;
      return matchesQuery && matchesSource;
    })
    .sort((left, right) => left.email.localeCompare(right.email, undefined, { sensitivity: "base" }));
  const grantPageCount = Math.max(1, Math.ceil(visibleGrants.length / grantPageSize));
  const safeGrantPage = Math.min(grantPage, grantPageCount);
  const pagedGrants = visibleGrants.slice(
    (safeGrantPage - 1) * grantPageSize,
    safeGrantPage * grantPageSize,
  );
  const grantRangeStart = visibleGrants.length ? (safeGrantPage - 1) * grantPageSize + 1 : 0;
  const grantRangeEnd = Math.min(safeGrantPage * grantPageSize, visibleGrants.length);
  useEffect(() => {
    setGrantQuery("");
    setGrantPage(1);
    setGrantSourceFilter("ALL");
  }, [model.selected?.item.id]);
  useEffect(() => {
    setGrantPage(1);
  }, [grantQuery, grantSourceFilter, grantPageSize]);
  return (
    <section className="share-section">
      <h3>Access</h3>
      {isTeamCredential ? (
        <p className="muted">
          Direct sharing is disabled because this credential is in a team
          collection. Manage members and roles from the Teams page so access
          stays controlled by team membership.
        </p>
      ) : (
        <>
          <p className="muted">
            This is a personal credential. You can share it with a registered
            user directly. After a direct share exists, remove it before moving
            the credential into a team collection.
          </p>
          <form onSubmit={shareEntry} className="inline-form share-form">
            <div className="share-user-picker">
              <input
                type="email"
                placeholder="Search registered users"
                aria-label="Search users to share with"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                required
                autoComplete="off"
              />
              {shareUsers.length > 0 && (
                <div
                  className="user-suggestions"
                  role="listbox"
                  aria-label="Matching users"
                >
                  {shareUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      role="option"
                      onClick={() => setShareEmail(user.email)}
                    >
                      {user.firstName} {user.lastName} · {user.email}
                    </button>
                  ))}
                </div>
              )}
              {shareEmail.trim().length >= 2 && shareUsers.length === 0 && (
                <p className="user-search-empty" role="status">
                  No user found
                </p>
              )}
            </div>
            <select
              value={shareRole}
              onChange={(e) => setShareRole(e.target.value as Role)}
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button disabled={busy}>Share</button>
          </form>
        </>
      )}
      {grants.length > 0 && (
        <div className="access-toolbar">
          <input
            className="access-search"
            type="search"
            aria-label="Search users with access"
            placeholder="Search users with access…"
            value={grantQuery}
            onChange={(event) => setGrantQuery(event.target.value)}
          />
          <select
            aria-label="Filter access source"
            value={grantSourceFilter}
            onChange={(event) => setGrantSourceFilter(event.target.value as typeof grantSourceFilter)}
          >
            <option value="ALL">All access</option>
            <option value="OWNER">Owner</option>
            <option value="DIRECT">Direct share</option>
            <option value="COLLECTION">Team collection</option>
          </select>
          <label className="access-page-size" title="Rows per page">
            <select
              aria-label="Access rows per page"
              value={grantPageSize}
              onChange={(event) => setGrantPageSize(Number(event.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      )}
      {grants.length > 0 && (
        <div className="access-summary" role="status">
          {grantRangeStart}–{grantRangeEnd} of {visibleGrants.length} {visibleGrants.length === 1 ? "user" : "users"}
        </div>
      )}
      <div className="grant-list">
        {pagedGrants.map((grant) => (
          <div key={grant.userId} className="grant-row">
            <span>
              {grant.email} <small>{grant.source.toLowerCase()}</small>
            </span>
            {grant.source === "DIRECT" ? (
              <>
                <select
                  value={grant.role}
                  onChange={(e) => changeGrant(grant, e.target.value as Role)}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="button"
                  className="icon-button subtle danger-icon"
                  aria-label={`Remove access for ${grant.email}`}
                  title="Remove access"
                  disabled={busy}
                  onClick={() => revokeGrant(grant)}
                >
                  <Icon name="trash" size={15} />
                </button>
              </>
            ) : (
              <strong>{grant.role}</strong>
            )}
          </div>
        ))}
        {visibleGrants.length === 0 && grants.length > 0 && (
          <p className="muted small">No users with access found.</p>
        )}
      </div>
      {visibleGrants.length > 0 && (
        <div className="pagination" aria-label="Access list pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={safeGrantPage === 1}
            onClick={() => setGrantPage((page) => Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span>Page {safeGrantPage} of {grantPageCount}</span>
          <button
            type="button"
            className="secondary-button"
            disabled={safeGrantPage === grantPageCount}
            onClick={() => setGrantPage((page) => Math.min(grantPageCount, page + 1))}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
