import { request } from "../../shared/api";
import {
  decryptRecord,
  exportPrivateKey,
  importPrivateKey,
  unlock,
  withPrivateKey,
} from "../../shared/crypto";
import { totp } from "../../shared/helpers";
import { isLocked } from "../../shared/locking";
import type {
  CryptoInfo,
  Item,
  Session,
  VaultRecord,
} from "../../shared/types";

const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const login = el<HTMLElement>("login"),
  unlockPanel = el<HTMLElement>("unlock"),
  vault = el<HTMLElement>("vault");
const status = el<HTMLElement>("status"),
  list = el<HTMLElement>("items"),
  search = el<HTMLInputElement>("search");
let token = "",
  privateKey = "",
  items: { item: Item; record: VaultRecord }[] = [];
function show(panel: "login" | "unlock" | "vault") {
  login.hidden = panel !== "login";
  unlockPanel.hidden = panel !== "unlock";
  vault.hidden = panel !== "vault";
  el<HTMLButtonElement>("lock").hidden = panel !== "vault";
}
function error(caught: unknown) {
  status.textContent =
    caught instanceof Error ? caught.message : "Request failed";
}
async function touch() {
  const result = (await chrome.runtime.sendMessage({ type: "TOUCH" })) as {
    error?: string;
  };
  if (result?.error) throw new Error(result.error);
}
async function readItems() {
  const activeKey = privateKey;
  if (!activeKey) return;
  const key = withPrivateKey(await importPrivateKey(privateKey));
  const raw = await request<Item[]>(token, "/items");
  const loaded = await Promise.all(
    raw.map(async (item) => ({ item, record: await decryptRecord(item, key) })),
  );
  if (privateKey !== activeKey) return;
  items = loaded;
  render();
}
function action(text: string, handler: () => Promise<void>): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", () => void handler().catch(error));
  return button;
}
function render() {
  list.replaceChildren();
  const q = search.value.trim().toLowerCase();
  const shown = items.filter(({ record }) =>
    [record.title, record.url, record.category, record.username].some((value) =>
      value.toLowerCase().includes(q),
    ),
  );
  if (!shown.length) {
    const p = document.createElement("p");
    p.textContent = "No credentials found.";
    list.append(p);
  }
  for (const { item, record } of shown) {
    const card = document.createElement("article");
    card.className = "item";
    const title = document.createElement("strong");
    title.textContent = record.title || record.url || "Untitled";
    const subtitle = document.createElement("small");
    subtitle.textContent = `${record.username} · ${record.url}`;
    const buttons = document.createElement("div");
    buttons.className = "actions";
    buttons.append(
      action("Fill", async () => {
        const result = (await chrome.runtime.sendMessage({
          type: "FILL_ACTIVE",
          itemId: item.id,
        })) as { error?: string };
        if (result?.error) throw new Error(result.error);
        await touch();
        window.close();
      }),
    );
    buttons.append(
      action("Username", async () => {
        await touch();
        await navigator.clipboard.writeText(record.username);
        status.textContent = "Username copied";
      }),
    );
    buttons.append(
      action("Password", async () => {
        await touch();
        await navigator.clipboard.writeText(record.password);
        status.textContent = "Password copied";
      }),
    );
    if (record.totpSecret)
      buttons.append(
        action("TOTP", async () => {
          await touch();
          await navigator.clipboard.writeText(await totp(record.totpSecret!));
          status.textContent = "TOTP copied";
        }),
      );
    card.append(title, subtitle, buttons);
    list.append(card);
  }
}
async function boot() {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
  const state = await chrome.storage.session.get([
    "token",
    "privateKey",
    "lastActive",
    "expiresAt",
  ]);
  if (state.expiresAt && Date.now() > Date.parse(state.expiresAt as string)) {
    await chrome.storage.session.clear();
    show("login");
    return;
  }
  token = typeof state.token === "string" ? state.token : "";
  privateKey = typeof state.privateKey === "string" ? state.privateKey : "";
  if (privateKey && isLocked(state.lastActive)) {
    privateKey = "";
    await chrome.storage.session.remove(["privateKey", "lastActive"]);
  }
  if (!token) show("login");
  else if (!privateKey) show("unlock");
  else {
    show("vault");
    await readItems();
    search.focus();
    await touch();
  }
}
el<HTMLFormElement>("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "";
  void (async () => {
    const email = el<HTMLInputElement>("email").value,
      accountPassword = el<HTMLInputElement>("account-password").value;
    const session = await request<Session>(null, "/auth/login", "POST", {
      email,
      accountPassword,
    });
    token = session.token;
    await chrome.storage.session.set({
      token,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
    el<HTMLInputElement>("account-password").value = "";
    show("unlock");
  })().catch(error);
});
el<HTMLFormElement>("unlock-form").addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "";
  void (async () => {
    const info = await request<CryptoInfo>(token, "/auth/crypto");
    const keys = await unlock(el<HTMLInputElement>("master").value, info, true);
    privateKey = await exportPrivateKey(keys);
    el<HTMLInputElement>("master").value = "";
    await chrome.storage.session.set({ privateKey, lastActive: Date.now() });
    await touch();
    show("vault");
    await readItems();
    search.focus();
  })().catch(error);
});
el<HTMLButtonElement>("lock").addEventListener(
  "click",
  () =>
    void (async () => {
      privateKey = "";
      items = [];
      list.replaceChildren();
      await chrome.storage.session.remove([
        "privateKey",
        "lastActive",
        "pending",
      ]);
      show("unlock");
    })(),
);
el<HTMLButtonElement>("sign-out").addEventListener(
  "click",
  () =>
    void (async () => {
      await request(token, "/auth/logout", "POST").catch(() => undefined);
      await chrome.storage.session.clear();
      token = "";
      privateKey = "";
      items = [];
      list.replaceChildren();
      show("login");
    })(),
);
search.addEventListener("input", render);
void boot().catch(error);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "session") return;
  if (changes.privateKey && !changes.privateKey.newValue) {
    privateKey = "";
    items = [];
    list.replaceChildren();
    search.value = "";
    show(token ? "unlock" : "login");
  }
  if (changes.token && !changes.token.newValue) {
    token = "";
    show("login");
  }
});
