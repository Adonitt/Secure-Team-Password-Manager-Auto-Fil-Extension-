import type { VaultModel } from "../hooks/useVault";
import { Icon } from "../components/Icon";

export function AuthPage({ model }: { model: VaultModel }) {
  const {
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
    error,
    setError,
    busy,
    authenticate,
  } = model;
  return (
    <main className="gate">
      <section className="gate-card">
        <div className="brand">
          <span className="brand-icon"><Icon name="vault" size={17} /></span> Team Vault
        </div>
        <h1>{mode === "login" ? "Welcome back" : "Create your vault"}</h1>
        <p className="muted">
          A private place for your team’s logins. Sign in to your account, then
          unlock your vault.
        </p>
        <form onSubmit={authenticate} className="stack">
          {mode === "register" && (
            <label>
              First name
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
                autoComplete="given-name"
              />
            </label>
          )}
          {mode === "register" && (
            <label>
              Last name
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
                autoComplete="family-name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Account password
            <input
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              minLength={12}
              maxLength={200}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>
          {mode === "register" && (
            <label>
              Confirm account password
              <input
                type="password"
                value={accountPasswordConfirmation}
                onChange={(e) => setAccountPasswordConfirmation(e.target.value)}
                minLength={12}
                maxLength={200}
                required
                autoComplete="new-password"
              />
            </label>
          )}
          {mode === "register" && (
            <label>
              Master password
              <input
                type="password"
                value={master}
                onChange={(e) => setMaster(e.target.value)}
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
          )}
          {mode === "register" && (
            <label>
              Confirm master password
              <input
                type="password"
                value={masterConfirmation}
                onChange={(e) => setMasterConfirmation(e.target.value)}
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
          )}
          {mode === "register" && (
            <p className="muted small">
              Use different passwords. Keep your master password safe: this demo
              cannot recover a locked vault.
            </p>
          )}
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>
            {busy
              ? "Working…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <button
          className="link"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Create an account" : "I already have an account"}
        </button>
      </section>
    </main>
  );
}
