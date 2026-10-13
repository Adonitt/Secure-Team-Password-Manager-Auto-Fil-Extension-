import type { VaultModel } from "../hooks/useVault";
import { rank } from "../utils/permissions";
import { Icon } from "./Icon";

export function CredentialForm({ model, readOnly = false }: { model: VaultModel; readOnly?: boolean }) {
  const {
    selected,
    draft,
    setDraft,
    collectionId,
    setCollectionId,
    showPassword,
    setShowPassword,
    busy,
    code,
    workspaces,
    grants,
    saveEntry,
    deleteEntry,
  } = model;
  const hasDirectShares =
    !!selected?.item.hasDirectShares ||
    grants.some((grant) => grant.source === "DIRECT");
  const disabled = readOnly || (!!selected && rank(selected.item.role) < 2);
  return (
    <form onSubmit={saveEntry} className="form-grid">
      <label>
        Title
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          required
          disabled={disabled}
        />
      </label>
      <label>
        Website URL
        <input
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          placeholder="https://example.com"
          required
          disabled={disabled}
        />
      </label>
      <label>
        Username / email
        <input
          value={draft.username}
          onChange={(e) => setDraft({ ...draft, username: e.target.value })}
          required
          disabled={disabled}
        />
      </label>
      <label>
        Password
        <div className="input-row">
          <input
            aria-label="Password"
            type={showPassword ? "text" : "password"}
            value={draft.password}
            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            required
            disabled={disabled}
          />
          <button
            type="button"
            className="icon-button subtle"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
          </button>
        </div>
      </label>
      <label>
        Category
        <select
          aria-label="Category"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          disabled={disabled}
        >
          <option>Personal</option>
          <option>Work</option>
          <option>Social</option>
          {!["Personal", "Work", "Social"].includes(draft.category) && (
            <option>{draft.category}</option>
          )}
        </select>
      </label>
      <label>
        {selected ? "Saved in" : "Collection"}
        <select
          aria-label="Collection"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          disabled={disabled}
        >
          <option value="">Personal vault</option>
          {selected &&
            selected.item.collectionId &&
            (hasDirectShares ||
              !workspaces.some((team) =>
                team.collections.some(
                  (collection) => collection.id === selected.item.collectionId,
                ),
              )) && (
              <option value={selected.item.collectionId}>
                Current team collection
              </option>
            )}
          {!hasDirectShares &&
            workspaces
              .filter((team) => rank(team.role) >= 2)
              .flatMap((team) =>
                team.collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {team.name} / {collection.name}
                  </option>
                )),
              )}
        </select>
        {selected && hasDirectShares && !selected.item.collectionId && (
          <small className="field-help">
            Cannot move to a team collection because this credential has direct
            access. Remove that access first.
          </small>
        )}
        {selected && !hasDirectShares && !selected.item.collectionId && (
          <small className="field-help">
            No direct access is configured, so you can save this credential in
            your personal vault or an accessible team collection.
          </small>
        )}
        {selected && selected.item.collectionId && (
          <small className="field-help">
            This credential uses team access. Its users and roles are managed
            from the Teams page.
          </small>
        )}
        {!selected && (
          <small className="field-help">
            Choose Personal vault or a team collection when you save this new
            credential.
          </small>
        )}
      </label>
      <label className="wide">
        Secure notes
        <textarea
          aria-label="Secure notes"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="wide">
        TOTP secret (optional)
        <input
          type="password"
          value={draft.totpSecret || ""}
          onChange={(e) => setDraft({ ...draft, totpSecret: e.target.value })}
          disabled={disabled}
        />
      </label>
      {code && (
        <p className="wide">
          Current TOTP: <strong>{code}</strong>
        </p>
      )}
      <div className="actions wide">
        {!readOnly && (!selected || rank(selected.item.role) >= 2) && (
          <button disabled={busy}>Save credential</button>
        )}
        {!readOnly && selected?.item.role === "OWNER" && (
          <button type="button" className="danger" onClick={deleteEntry}>
            <Icon name="trash" size={14} /> Delete credential
          </button>
        )}
      </div>
    </form>
  );
}
