import type { VaultModel } from "../hooks/useVault";
import { Icon } from "../components/Icon";

export function UnlockPage({ model }: { model: VaultModel }) {
  const { master, setMaster, error, busy, unlockVault, logout } = model;
  return (
    <main className="gate">
      <section className="gate-card">
        <div className="brand"><span className="brand-icon"><Icon name="vault" size={17} /></span>Team Vault</div>
        <h1>Unlock your vault</h1>
        <p className="muted">
          Enter your master password. It never goes to the server.
        </p>
        <form onSubmit={unlockVault} className="stack">
          <label>
            Master password
            <input
              type="password"
              value={master}
              onChange={(e) => setMaster(e.target.value)}
              required
              autoFocus
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? "Unlocking…" : "Unlock"}</button>
        </form>
        <button className="link" onClick={logout}>
          <Icon name="logout" size={14} /> Sign out
        </button>
      </section>
    </main>
  );
}
