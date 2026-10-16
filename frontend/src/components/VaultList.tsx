import { useEffect, useMemo, useRef, useState } from "react";
import type { VaultModel } from "../hooks/useVault";
import { Icon } from "./Icon";

function websiteLabel(url: string) {
  if (!url) return "No website";
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function VaultList({ model }: { model: VaultModel }) {
  const { entries, selectedId, query, setQuery, categoryFilter, setCategoryFilter,
    ownershipFilter, setOwnershipFilter, filtered, openEditor, workspaces } = model;
  const searchRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState("ALL");
  const [sortBy, setSortBy] = useState("title");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const categories = useMemo(() => [...new Set(entries.map((entry) => entry.record.category).filter(Boolean))].sort(), [entries]);
  const shown = useMemo(() => filtered
    .filter((entry) => location === "ALL" || (location === "PERSONAL" ? !entry.item.collectionId : entry.item.collectionId === location))
    .sort((a, b) => {
      const left = sortBy === "website" ? websiteLabel(a.record.url) : sortBy === "category" ? a.record.category : a.record.title;
      const right = sortBy === "website" ? websiteLabel(b.record.url) : sortBy === "category" ? b.record.category : b.record.title;
      return left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }) || a.record.title.localeCompare(b.record.title);
    }), [filtered, location, sortBy]);
  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, ownershipFilter, location, sortBy]);
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageEntries = shown.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = shown.length ? (safePage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * pageSize, shown.length);
  const hasFilters = !!query || categoryFilter !== "All" || ownershipFilter !== "ALL" || location !== "ALL";
  function clearFilters() {
    setQuery(""); setCategoryFilter("All"); setOwnershipFilter("ALL"); setLocation("ALL");
  }
  function locationLabel(collectionId: string | null) {
    if (!collectionId) return "Personal";
    for (const team of workspaces) {
      const collection = team.collections.find((candidate) => candidate.id === collectionId);
      if (collection) return `${team.name} / ${collection.name}`;
    }
    return "Team collection";
  }
  function openCollection(collectionId: string | null) {
    if (!collectionId) return;
    const team = workspaces.find((workspace) =>
      workspace.collections.some((collection) => collection.id === collectionId),
    );
    if (!team) return;
    model.setTeamId(team.id);
    model.setCollectionViewId(collectionId);
    model.setTab("teams");
    model.setEditorOpen(false);
  }

  return (
    <main className="vault-browser" aria-label="Credential browser">
      <div className="vault-heading">
        <div>
          <h1>Vault</h1>
          <p className="page-subtitle">Find and manage the credentials you can access.</p>
        </div>
        <button className="primary-button" onClick={() => openEditor(null)}><Icon name="plus" size={15} /> New credential</button>
      </div>
      <div className="vault-tools">
        <div className="search-field">
          <Icon name="search" size={16} />
          <input ref={searchRef} aria-label="Search credentials" placeholder="Search name, email or website" value={query} onChange={(event) => setQuery(event.target.value)} />
          {query && <button type="button" className="icon-button subtle" aria-label="Clear search" title="Clear search" onClick={() => setQuery("")}><Icon name="close" size={14} /></button>}
          <kbd>Ctrl K</kbd>
        </div>
        <label className="sr-only" htmlFor="category-filter">Category</label>
        <select id="category-filter" aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="All">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <label className="sr-only" htmlFor="access-filter">Access</label>
        <select id="access-filter" aria-label="Filter by access" value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value as typeof ownershipFilter)}>
          <option value="ALL">Any access</option><option value="OWNED">Owned by me</option><option value="SHARED">Shared with me</option>
        </select>
        <label className="sr-only" htmlFor="location-filter">Location</label>
        <select id="location-filter" aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)}>
          <option value="ALL">All locations</option><option value="PERSONAL">Personal vault</option>
          {workspaces.flatMap((team) => team.collections.map((collection) => <option key={collection.id} value={collection.id}>{team.name} / {collection.name}</option>))}
        </select>
        <label className="sr-only" htmlFor="sort-filter">Sort</label>
        <select id="sort-filter" aria-label="Sort credentials" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="title">Name A–Z</option><option value="website">Website A–Z</option><option value="category">Category A–Z</option>
        </select>
      </div>
      <div className="table-summary"><span role="status">{rangeStart}–{rangeEnd} of {shown.length} {shown.length === 1 ? "credential" : "credentials"}</span>{hasFilters && <button className="text-button" onClick={clearFilters}>Clear filters</button>}<label className="page-size-control" title="Rows per page"><select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
      <div className="entry-table-wrap">
        {shown.length ? <table className="entry-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Username</th><th scope="col">Website</th><th scope="col">Location</th><th scope="col">Access</th><th scope="col">Your role</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{pageEntries.map((entry) => {
            const title = entry.record.title || websiteLabel(entry.record.url) || "Untitled";
            const owned = entry.item.ownerId === model.session?.userId;
            const active = selectedId === entry.item.id;
            return <tr key={entry.item.id} className={active ? "active-row" : ""}>
              <td><div className="credential-name"><span className="credential-mark"><Icon name="key" size={15} /></span><span><strong>{title}</strong><small>{entry.record.category || "Uncategorized"}</small></span></div></td>
              <td><span className="table-value">{entry.record.username || <span className="muted">—</span>}</span></td>
              <td><a className="site-link" href={entry.record.url ? (entry.record.url.includes("://") ? entry.record.url : `https://${entry.record.url}`) : undefined} target="_blank" rel="noreferrer" onClick={(event) => { if (!entry.record.url) event.preventDefault(); }} title={entry.record.url || "No website saved"}>{websiteLabel(entry.record.url)}{entry.record.url && <Icon name="external" size={12} />}</a></td>
              <td>
                {entry.item.collectionId && workspaces.some((team) => team.collections.some((collection) => collection.id === entry.item.collectionId)) ? (
                  <button
                    type="button"
                    className="location-label location-link"
                    onClick={() => openCollection(entry.item.collectionId)}
                    title="Open this team collection"
                  >
                    <Icon name="folder" size={13} />
                    {locationLabel(entry.item.collectionId)}
                  </button>
                ) : (
                  <span className="location-label">
                    <Icon name={entry.item.collectionId ? "folder" : "vault"} size={13} />
                    {locationLabel(entry.item.collectionId)}
                  </span>
                )}
              </td>
              <td><span className={`access-label ${owned ? "owned" : "shared"}`}>{owned ? "Owned" : "Shared"}</span></td>
              <td><span className="role-label">{entry.item.role.toLowerCase()}</span></td>
              <td><button className="details-button" aria-label={`View details for ${title}`} onClick={() => openEditor(entry, "view")}><Icon name="info" size={14} /> Details</button></td>
            </tr>;
          })}</tbody>
        </table> : <div className="empty-state"><span className="empty-mark"><Icon name={hasFilters ? "search" : "vault"} size={20} /></span><h2>{hasFilters ? "No matching credentials" : "Your vault is empty"}</h2><p>{hasFilters ? "Try a different search or clear the filters." : "Add a credential to start building your vault."}</p>{hasFilters ? <button className="secondary-button" onClick={clearFilters}>Clear filters</button> : <button className="primary-button" onClick={() => openEditor(null)}><Icon name="plus" size={15} /> Add credential</button>}</div>}
      </div>
      {shown.length > 0 && <nav className="pagination" aria-label="Credential pages"><span className="pagination-range">Page {safePage} of {pageCount}</span><div><button className="secondary-button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="secondary-button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div></nav>}
      <p className="vault-footnote"><Icon name="shield" size={13} /> Credentials are encrypted before they leave your browser.</p>
    </main>
  );
}
