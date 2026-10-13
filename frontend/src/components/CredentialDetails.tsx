import type { VaultModel } from "../hooks/useVault";
import { Icon } from "./Icon";

export function CredentialDetails({ model }: { model: VaultModel }) {
  const selected = model.selected;
  if (!selected) return null;
  const { record, item } = selected;
  const website = record.url
    ? (record.url.includes("://") ? record.url : `https://${record.url}`)
    : "";
  const copy = (value: string) => {
    if (value) void navigator.clipboard.writeText(value).then(() => model.setNotice("Copied to clipboard"));
  };
  return <div className="credential-details">
    <div className="details-title-row">
      <span className="details-mark"><Icon name="key" size={19} /></span>
      <div className="details-title"><h3>{record.title || "Untitled credential"}</h3><div className="details-badges"><span>{record.category || "Uncategorized"}</span></div></div>
      <div className="details-actions">
        {item.role !== "VIEWER" && <button type="button" className="secondary-button" onClick={() => model.setEditorMode("edit")}><Icon name="edit" size={14} /> Edit</button>}
        {item.role === "OWNER" && <button type="button" className="icon-button danger-icon" aria-label="Delete credential" title="Delete credential" onClick={() => void model.deleteEntry()}><Icon name="trash" size={16} /></button>}
      </div>
    </div>
    <dl className="detail-fields">
      <div className="detail-field"><dt>Website</dt><dd>{website ? <a href={website} target="_blank" rel="noreferrer">{record.url}<Icon name="external" size={13} /></a> : <span className="detail-empty">No website saved</span>}</dd></div>
      <div className="detail-field"><dt>Username / email</dt><dd><span>{record.username || <span className="detail-empty">Not set</span>}</span>{record.username && <button className="icon-button subtle" type="button" aria-label="Copy username" title="Copy username" onClick={() => copy(record.username)}><Icon name="copy" size={14} /></button>}</dd></div>
      <div className="detail-field"><dt>Password</dt><dd><span className="secret-value">{model.showPassword ? record.password : "••••••••••••"}</span><button className="icon-button subtle" type="button" aria-label={model.showPassword ? "Hide password" : "Show password"} title={model.showPassword ? "Hide password" : "Show password"} onClick={() => model.setShowPassword(!model.showPassword)}><Icon name={model.showPassword ? "eyeOff" : "eye"} size={15} /></button><button className="icon-button subtle" type="button" aria-label="Copy password" title="Copy password" onClick={() => copy(record.password)}><Icon name="copy" size={14} /></button></dd></div>
      {record.totpSecret && <div className="detail-field"><dt>Authenticator code</dt><dd><span className="totp-value">{model.code || "••••••"}</span><span className="detail-caption">Refreshes automatically</span></dd></div>}
      <div className="detail-field detail-field-wide"><dt>Secure notes</dt><dd>{record.notes || <span className="detail-empty">No notes</span>}</dd></div>
    </dl>
  </div>;
}
