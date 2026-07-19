import { IndexedDbDraftRepository, MemoryDraftRepository, loadOrCreateDraft, type DraftRepository } from "./persistence.js";
import { createDefaultDraft } from "./domain.js";
import { BuilderStore } from "./store.js";
import { BuilderUi } from "./ui.js";

async function start(): Promise<void> {
  let repository: DraftRepository = new IndexedDbDraftRepository();
  let loaded;
  let volatileStorage = false;
  try { loaded = await loadOrCreateDraft(repository); }
  catch (error) {
    console.error("Lokaler Speicher nicht verfügbar; der Entwurf gilt nur für diese Sitzung.", error);
    repository = new MemoryDraftRepository(); volatileStorage = true;
    const draft = createDefaultDraft(); await repository.putDraft(draft); loaded = { draft, recovered: false };
  }
  const store = new BuilderStore(loaded.draft, repository);
  new BuilderUi(store, repository).init({ ...loaded, volatileStorage });
}

void start().catch((error) => {
  console.error(error);
  const status = document.getElementById("saveStatus");
  if (status) { status.textContent = "Werkzeug konnte nicht geladen werden"; status.className = "status-pill is-error"; }
});
