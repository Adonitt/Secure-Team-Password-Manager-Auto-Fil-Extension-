import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Icon";

type HelpDialogProps = {
  onClose: () => void;
};

const sections: { id: string; title: string; icon: IconName }[] = [
  { id: "help-sign-in", title: "Sign in & unlock", icon: "lock" },
  { id: "help-sharing", title: "Sharing credentials", icon: "userPlus" },
  { id: "help-teams", title: "Teams & collections", icon: "teams" },
  { id: "help-extension", title: "Browser extension", icon: "key" },
  { id: "help-transfer", title: "Import & export", icon: "transfer" },
];

export function HelpDialog({ onClose }: HelpDialogProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function goToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="modal-backdrop help-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-card help-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        aria-describedby="help-dialog-intro"
      >
        <header className="help-header">
          <div>
            <h2 id="help-dialog-title">How Team Vault works</h2>
            <p id="help-dialog-intro">
              A practical guide to signing in, sharing access and using your browser extension.
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="icon-button subtle"
            aria-label="Close help"
            title="Close help"
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="help-layout">
          <nav className="help-nav" aria-label="Help topics">
            <span className="help-nav-title">In this guide</span>
            {sections.map((section) => (
              <button key={section.id} type="button" onClick={() => goToSection(section.id)}>
                <Icon name={section.icon} size={15} />
                {section.title}
              </button>
            ))}
            <div className="help-nav-note">
              <Icon name="shield" size={15} />
              <span>Passwords are encrypted in your browser before they are stored.</span>
            </div>
          </nav>

          <article className="help-article">
            <section id="help-sign-in" className="help-section">
              <h3>Sign in, then unlock</h3>
              <p>
                These two passwords do different jobs. Your account password signs you in to Team Vault.
                Your master password unlocks the encryption keys that let your browser read credentials.
              </p>
              <div className="help-login-flow" role="group" aria-label="Sign-in and unlock flow">
                <div className="help-flow-step">
                  <span className="help-step-icon"><Icon name="userPlus" size={17} /></span>
                  <div><strong>1. Sign in</strong><span>Account password verifies your account and starts a session.</span></div>
                </div>
                <span className="help-flow-arrow" aria-hidden="true">→</span>
                <div className="help-flow-step">
                  <span className="help-step-icon"><Icon name="lock" size={17} /></span>
                  <div><strong>2. Unlock vault</strong><span>Master password unlocks your private key and encrypted credentials.</span></div>
                </div>
              </div>
              <p className="help-caption">
                The backend stores encrypted credentials and an encrypted copy of your private key. The browser decrypts them after you unlock.
              </p>
            </section>

            <section id="help-sharing" className="help-section">
              <h3>How sharing works</h3>
              <p>
                Share a personal credential with another registered Team Vault user, or place it in a team collection.
                Your browser encrypts the credential and prepares an encrypted key for each person who should have access.
              </p>
              <div className="help-share-flow" role="group" aria-label="Encrypted credential sharing flow">
                <div className="help-flow-node">
                  <strong>Your browser</strong>
                  <span>Encrypts the credential and wraps its key with the teammate’s public key.</span>
                </div>
                <span className="help-flow-arrow" aria-hidden="true">→</span>
                <div className="help-flow-node help-server-node">
                  <strong>Team Vault server</strong>
                  <span>Stores encrypted data, encrypted keys and access roles.</span>
                </div>
                <span className="help-flow-arrow" aria-hidden="true">→</span>
                <div className="help-flow-node">
                  <strong>Teammate’s browser</strong>
                  <span>Uses their private key to unlock the shared key and read the credential.</span>
                </div>
              </div>
              <div className="help-note">
                <strong>Choose the right kind of share</strong>
                <p>
                  Direct share gives one user access to a personal credential. A collection shares its credentials through team membership and roles.
                  Team credentials are managed from the team; they cannot also have a separate direct share.
                </p>
              </div>
            </section>

            <section id="help-teams" className="help-section">
              <h3>Teams, collections and roles</h3>
              <p>
                A team is the membership boundary. A collection is a named place inside that team for related credentials, such as billing or social accounts.
                Add registered users to the team, assign a role, then put shared credentials in a collection.
              </p>
              <div className="help-team-map" role="group" aria-label="Team contains members and collections; collections contain credentials">
                <div className="help-map-root"><Icon name="teams" size={16} /><strong>Team</strong></div>
                <div className="help-map-branches">
                  <div><span className="help-map-label"><Icon name="userPlus" size={14} /> Members</span><small>People and their team roles</small></div>
                  <div><span className="help-map-label"><Icon name="folder" size={14} /> Collections</span><small>Credentials shared with team members</small></div>
                </div>
              </div>
              <div className="help-role-list" aria-label="Team role descriptions">
                <div><strong>Viewer</strong><span>Can view credentials.</span></div>
                <div><strong>Editor</strong><span>Can view and edit existing credentials.</span></div>
                <div><strong>Admin</strong><span>Can manage members, roles, collections and team access.</span></div>
                <div><strong>Owner</strong><span>Created the team and has full team control.</span></div>
              </div>
              <p className="help-caption">
                New credentials in team collections and membership changes are restricted to team admins and owners.
              </p>
            </section>

            <section id="help-extension" className="help-section">
              <h3>Use the browser extension</h3>
              <p>
                Sign in to the extension with the same account and unlock it with your master password. On a matching website, choose a credential from the popup or the field’s Team Vault control.
                The extension fills the login fields only after you select an item; it never submits the form for you.
              </p>
            </section>

            <section id="help-transfer" className="help-section">
              <h3>Import and export</h3>
              <p>
                Import supported CSV or JSON files into your personal vault. The browser reads and encrypts imported credentials before upload.
                Export downloads your owned personal credentials in readable form, so keep the file private.
              </p>
            </section>
          </article>
        </div>

        <footer className="help-footer">
          <span><Icon name="lock" size={14} /> Your master password is used to unlock the vault in your browser.</span>
          <button type="button" className="primary-button" onClick={onClose}>Got it</button>
        </footer>
      </section>
    </div>
  );
}
