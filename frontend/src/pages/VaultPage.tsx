import { useEffect } from "react";
import type { VaultModel } from "../hooks/useVault";
import { rank } from "../utils/permissions";
import { VaultList } from "../components/VaultList";
import { CredentialForm } from "../components/CredentialForm";
import { CredentialDetails } from "../components/CredentialDetails";
import { SharingPanel } from "../components/SharingPanel";
import { Icon } from "../components/Icon";

export function VaultPage({ model }: { model: VaultModel }) {
  const { selected } = model;
  const teamLocation = selected?.item.collectionId
    ? model.workspaces.flatMap((team) => team.collections.map((collection) => ({ teamId: team.id, collectionId: collection.id, label: `${team.name} / ${collection.name}` }))).find((location) => location.collectionId === selected.item.collectionId)
    : undefined;
  const savedLocation = selected ? teamLocation?.label || (selected.item.collectionId ? "Team collection" : "Personal vault") : "";
  useEffect(() => {
    if (!model.editorOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") model.setEditorOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [model.editorOpen, model.setEditorOpen]);
  function openTeamCollection() {
    if (!teamLocation) return;
    model.setTeamId(teamLocation.teamId);
    model.setCollectionViewId(teamLocation.collectionId);
    model.setTab("teams");
    model.setEditorOpen(false);
  }
  return <>
    <VaultList model={model} />
    {model.editorOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) model.setEditorOpen(false); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="credential-drawer-title">
        <header className="drawer-heading"><div><h2 id="credential-drawer-title">{selected ? (model.editorMode === "edit" ? "Edit credential" : "Credential details") : "New credential"}</h2><p>{selected ? "Review the saved login and its access." : "Add a login to your vault."}</p></div><div className="drawer-heading-actions"><button type="button" className="icon-button subtle" aria-label="Close details" title="Close" onClick={() => model.setEditorOpen(false)}><Icon name="close" size={17} /></button></div></header>
        {selected && <section className="record-context" aria-label="Credential access details">
          <div><span className="context-key">Owner</span><span className="context-value">{selected.item.ownerEmail}{selected.item.ownerId === model.session?.userId ? " (you)" : ""}</span></div>
          {model.session && <div><span className="context-key">Your email</span><span className="context-value">{model.session.email}</span></div>}
          <div><span className="context-key">Your role</span><span className="context-value"><span className="context-role">{selected.item.role.toLowerCase()}</span></span></div>
          <div><span className="context-key">Saved in</span><span className="context-value">{savedLocation}</span></div>
          {teamLocation && <button type="button" className="text-button" onClick={openTeamCollection}>Open team collection <Icon name="chevron" size={13} /></button>}
        </section>}
        {selected && model.editorMode === "view" ? <CredentialDetails model={model} /> : <CredentialForm model={model} />}
        {selected && rank(selected.item.role) >= 3 && <SharingPanel model={model} />}
      </aside>
    </div>}
  </>;
}
