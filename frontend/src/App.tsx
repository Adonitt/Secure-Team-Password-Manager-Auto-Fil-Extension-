import { useState } from "react";
import { useVault } from "./hooks/useVault";
import { AuthPage } from "./pages/AuthPage";
import { UnlockPage } from "./pages/UnlockPage";
import { VaultPage } from "./pages/VaultPage";
import { TeamsPage } from "./pages/TeamsPage";
import { TransferPage } from "./pages/TransferPage";
import { Icon } from "./components/Icon";
import { HelpDialog } from "./components/HelpDialog";

export default function App() {
  const model = useVault();
  const [helpOpen, setHelpOpen] = useState(false);
  if (!model.session) return <AuthPage model={model} />;
  if (!model.keys) return <UnlockPage model={model} />;
  const hasProfileName = !!model.session.firstName?.trim() && !!model.session.lastName?.trim();
  const displayName = hasProfileName
    ? `${model.session.firstName.trim()} ${model.session.lastName.trim()}`
    : model.session.email;
  const initials = hasProfileName
    ? `${model.session.firstName.trim().slice(0, 1)}${model.session.lastName.trim().slice(0, 1)}`.toUpperCase()
    : model.session.email.slice(0, 1).toUpperCase();
  return <div className="app-shell">
    <aside className="side-nav">
      <a className="brand" href="#vault" onClick={(event) => { event.preventDefault(); model.setTab("vault"); }}><span className="brand-icon"><Icon name="vault" size={17} /></span><span>Team Vault</span></a>
      <div className="nav-group-label">Workspace</div>
      <nav aria-label="Main navigation">
        <button className={model.tab === "vault" ? "active" : ""} onClick={() => model.setTab("vault")}><Icon name="vault" size={17} />Vault</button>
        <button className={model.tab === "teams" ? "active" : ""} onClick={() => model.setTab("teams")}><Icon name="teams" size={17} />Teams</button>
        <button className={model.tab === "transfer" ? "active" : ""} onClick={() => model.setTab("transfer")}><Icon name="transfer" size={17} />Import & export</button>
      </nav>
      <div className="side-nav-bottom">
        <div className="security-status"><span className="status-dot"/><span><strong>Vault unlocked</strong><small>Auto-lock after 10 min</small></span></div>
        <button className="account-control" onClick={() => setHelpOpen(true)}><span className="avatar">{initials}</span><span className="account-email">{displayName}<small>{hasProfileName ? model.session.email : "Profile name not set"}</small></span><Icon name="info" size={15} /></button>
        <div className="bottom-actions"><button className="secondary-button" onClick={model.lockVault}><Icon name="lock" size={15} /> Lock vault</button><button className="icon-button subtle" aria-label="Sign out" title="Sign out" onClick={model.logout}><Icon name="logout" size={16} /></button></div>
      </div>
    </aside>
    <div className="app-main">
      <div className="mobile-topbar"><a className="brand" href="#vault" onClick={(event) => { event.preventDefault(); model.setTab("vault"); }}><span className="brand-icon"><Icon name="vault" size={17} /></span>Team Vault</a><div className="mobile-topbar-actions"><button className="icon-button subtle" aria-label="Open help" title="Help" onClick={() => setHelpOpen(true)}><Icon name="info" size={16} /></button><button className="icon-button subtle" aria-label="Lock vault" title="Lock vault" onClick={model.lockVault}><Icon name="lock" size={16} /></button></div></div>
      <nav className="mobile-nav" aria-label="Main navigation">
        <button className={model.tab === "vault" ? "active" : ""} onClick={() => model.setTab("vault")}><Icon name="vault" size={15} />Vault</button>
        <button className={model.tab === "teams" ? "active" : ""} onClick={() => model.setTab("teams")}><Icon name="teams" size={15} />Teams</button>
        <button className={model.tab === "transfer" ? "active" : ""} onClick={() => model.setTab("transfer")}><Icon name="transfer" size={15} />Transfer</button>
      </nav>
      <div className="status-strip"><span><span className="status-dot"/>Vault unlocked</span><span>Auto-lock after 10 minutes of inactivity</span><button onClick={model.lockVault}><Icon name="lock" size={13}/> Lock</button></div>
      {model.error && <div role="alert" className="banner error"><span>{model.error}</span><button aria-label="Dismiss error" onClick={() => model.setError("")}><Icon name="close" size={15}/></button></div>}
      {model.notice && <div role="status" className="banner success"><span>{model.notice}</span><button aria-label="Dismiss notice" onClick={() => model.setNotice("")}><Icon name="close" size={15}/></button></div>}
      {model.tab === "vault" && <VaultPage model={model} />}
      {model.tab === "teams" && <TeamsPage model={model} />}
      {model.tab === "transfer" && <TransferPage model={model} />}
    </div>
    {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
  </div>;
}
