import { useEffect, useState } from "react";
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
  const currentCollectionTeam = selected?.item.collectionId
    ? workspaces.find((team) =>
        team.collections.some(
          (collection) => collection.id === selected.item.collectionId,
        ),
      )
    : undefined;
  const destinationTeams = workspaces.filter((team) => rank(team.role) >= 3);
  const pickerTeams = hasDirectShares && !currentCollectionTeam
    ? []
    : currentCollectionTeam &&
        !destinationTeams.some((team) => team.id === currentCollectionTeam.id)
      ? [currentCollectionTeam, ...destinationTeams]
      : destinationTeams;
  const [collectionTeamId, setCollectionTeamId] = useState(
    currentCollectionTeam?.id || "",
  );
  useEffect(() => {
    setCollectionTeamId(currentCollectionTeam?.id || "");
  }, [currentCollectionTeam?.id, selected?.item.id]);
  const selectedCollectionTeam = pickerTeams.find(
    (team) => team.id === collectionTeamId,
  );
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
        {selected ? "Saved in" : "Save in"}
        <select
          aria-label="Vault package"
          value={collectionTeamId}
          onChange={(e) => {
            const teamId = e.target.value;
            setCollectionTeamId(teamId);
            setCollectionId("");
          }}
          disabled={disabled}
        >
          <option value="">Personal vault</option>
          {pickerTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        {selected && hasDirectShares && !selected.item.collectionId && (
          <small className="field-help">
            Cannot move to a team collection because this credential has direct
            access. Remove that access first.
          </small>
        )}
      </label>
      {selectedCollectionTeam && (
        <label>
          Collection
          <select
            aria-label="Collection"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            disabled={disabled}
            required
          >
            <option value="">Choose a collection…</option>
            {selectedCollectionTeam.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          {selected && selected.item.collectionId && (
            <small className="field-help">
              This credential uses team access. Its users and roles are managed
              from the Teams page.
            </small>
          )}
        </label>
      )}
      {!selected && !collectionTeamId && (
        <div className="field-help collection-picker-help">
          Choose Personal vault or a team/package first. Then choose its
          collection if you select a team.
        </div>
      )}
      {selected && !hasDirectShares && !selected.item.collectionId && (
        <small className="field-help collection-picker-help">
          No direct access is configured, so you can save this credential in
          your personal vault or an accessible team collection.
        </small>
      )}
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
