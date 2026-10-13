type HelpDialogProps = {
  onClose: () => void;
};

const guideSteps = [
  {
    title: "Login and unlock",
    text: "Sign in with your account, then unlock the vault with your master password. The vault stays locked until it is unlocked.",
  },
  {
    title: "Create a credential",
    text: "From Vault, choose New credential and enter the title, website, username and password. Save it in your personal vault or in a team collection you can access.",
  },
  {
    title: "Share access",
    text: "Personal credentials can be shared directly with another registered user. If direct access exists, remove it before moving the credential to a team collection.",
  },
  {
    title: "Use teams",
    text: "Create a team, add existing users by email and create collections for shared credentials. Team members use their role to view or edit the credentials.",
  },
  {
    title: "Use the Chrome extension",
    text: "Load the extension from the extension/dist folder in Chrome. Unlock it with the same account, then use Fill on a login page or save a new login to the selected vault.",
  },
  {
    title: "Lock and stay safe",
    text: "Use Lock when you finish, or let the automatic lock protect the session after inactivity. Passwords are encrypted before they are stored on the server.",
  },
];

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <div
      className="modal-backdrop"
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
      >
        <div className="modal-heading">
          <div>
            <h2 id="help-dialog-title">How Team Vault works</h2>
          </div>
          <button type="button" className="icon-button subtle" aria-label="Close help" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="help-intro">
          Team Vault stores encrypted login credentials and lets you control who can use them.
        </p>
        <ol className="help-list">
          {guideSteps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.text}</span>
            </li>
          ))}
        </ol>
        <div className="help-footer">
          <button type="button" className="primary-button" onClick={onClose}>
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}
import { Icon } from "./Icon";
