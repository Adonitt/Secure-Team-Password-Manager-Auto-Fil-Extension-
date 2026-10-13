import type { VaultModel } from "../hooks/useVault";
import { Icon } from "../components/Icon";

export function TransferPage({ model }: { model: VaultModel }) {
  const {
    importKind,
    setImportKind,
    importFile,
    setImportFile,
    busy,
    importFileNow,
    exportFile,
  } = model;
  return (
    <main className="page transfer-page">
      <div className="page-title">
        <div>
          <h1>Import & export</h1>
        </div>
      </div>
      <div className="two-col transfer-layout">
        <section className="card transfer-card">
          <h2><Icon name="upload" size={16} /> Import logins</h2>
          <p className="muted">
            Files are read in your browser. Credentials are encrypted before
            upload.
          </p>
          <label>
            Source
            <select
              value={importKind}
              onChange={(e) =>
                setImportKind(e.target.value as typeof importKind)
              }
            >
              <option value="chrome">Chrome CSV</option>
              <option value="onepassword">1Password CSV</option>
              <option value="bitwarden-csv">Bitwarden CSV</option>
              <option value="bitwarden-json">Bitwarden JSON</option>
              <option value="teamvault-json">Team Vault JSON</option>
            </select>
          </label>
          <label>
            File
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="primary-button transfer-primary" disabled={!importFile || busy} onClick={importFileNow}>
            <Icon name="upload" size={15} /> Import into personal vault
          </button>
        </section>
        <section className="card transfer-card">
          <h2><Icon name="download" size={16} /> Export personal vault</h2>
          <p className="muted">
            Exports contain readable passwords. Keep the downloaded file
            private.
          </p>
          <div className="transfer-actions">
            <button className="secondary-button" onClick={() => exportFile("json")}><Icon name="download" size={15} /> Download JSON</button>
            <button className="secondary-button" onClick={() => exportFile("csv")}>
              <Icon name="download" size={15} /> Download CSV
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
