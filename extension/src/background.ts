import { request } from "../../shared/api";
import {
  decryptRecord,
  encryptRecord,
  importPrivateKey,
  itemKey,
  newItem,
  wrapForUser,
  withPrivateKey,
} from "../../shared/crypto";
import { matchesDomain } from "../../shared/helpers";
import { AUTO_LOCK_MS, isLocked } from "../../shared/locking";
import type { CryptoInfo, Item, VaultRecord } from "../../shared/types";

type Message = {
  type: string;
  itemId?: string;
  username?: string;
  password?: string;
  collectionId?: string | null;
};
type Pending = {
  tabId: number;
  url: string;
  username: string;
  password: string;
  at: number;
  updateId?: string;
  collectionId?: string | null;
};
type TeamCollection = {
  id: string;
  label: string;
  members: { id: string; publicKey: string; role: string }[];
};
async function touch() {
  await chrome.storage.session.set({ lastActive: Date.now() });
  await chrome.alarms.create("auto-lock", { when: Date.now() + AUTO_LOCK_MS });
}
async function state() {
  const data = await chrome.storage.session.get([
    "token",
    "privateKey",
    "userId",
    "lastActive",
    "expiresAt",
  ]);
  const token = typeof data.token === "string" ? data.token : "";
  const privateKey = typeof data.privateKey === "string" ? data.privateKey : "";
  if (data.expiresAt && Date.now() > Date.parse(String(data.expiresAt))) {
    await chrome.storage.session.clear();
    throw new Error("Your session expired. Sign in again.");
  }
  if (!token || !privateKey || isLocked(data.lastActive)) {
    await chrome.storage.session.remove([
      "privateKey",
      "lastActive",
      "pending",
    ]);
    throw new Error("Vault is locked. Open the extension to unlock it.");
  }
  let userId = typeof data.userId === "string" ? data.userId : "";
  if (!userId) {
    const current = await request<{ id: string }>(token, "/auth/me");
    userId = current.id;
    await chrome.storage.session.set({ userId });
  }
  return {
    token,
    userId,
    privateKey,
    keys: withPrivateKey(await importPrivateKey(privateKey)),
  };
}
async function entries() {
  const { token, userId, privateKey, keys } = await state();
  const raw = await request<Item[]>(token, "/items");
  const values = await Promise.all(
    raw.map(async (item) => ({
      item,
      record: await decryptRecord(item, keys),
    })),
  );
  // Lock/sign-out can happen while the API request and decryption are in progress.
  const current = await state();
  if (current.token !== token || current.privateKey !== privateKey)
    throw new Error("Vault session changed. Open the extension again.");
  return {
    token,
    userId,
    keys,
    values,
  };
}
async function teamCollections(
  token: string,
  userId: string,
): Promise<TeamCollection[]> {
  const teams = await request<{ id: string; name: string; role: string }[]>(
    token,
    "/workspaces",
  );
  const details = await Promise.all(
    teams
      .filter((team) => team.role !== "VIEWER")
      .map((team) =>
        request<{
          id: string;
          name: string;
          members: { id: string; publicKey: string; role: string }[];
          collections: { id: string; name: string }[];
        }>(token, `/workspaces/${team.id}`),
      ),
  );
  return details.flatMap((team) =>
    team.collections.map((collection) => ({
      id: collection.id,
      label: `${team.name} / ${collection.name}`,
      members: team.members.filter((member) => member.id !== userId),
    })),
  );
}
async function activeTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.id || !tabs[0].url) throw new Error("No active website tab");
  return tabs[0];
}
async function fill(itemId: string, url: string, tabId?: number) {
  const data = await entries();
  const found = data.values.find((value) => value.item.id === itemId);
  if (!found || !matchesDomain(url, found.record.url))
    throw new Error("Credential does not match this website");
  await touch();
  const result = {
    username: found.record.username,
    password: found.record.password,
  };
  if (tabId) {
    const reply = (await chrome.tabs.sendMessage(tabId, {
      type: "FILL",
      ...result,
    })) as { ok?: boolean };
    if (!reply?.ok) throw new Error("No login field found on this page");
    return { ok: true };
  }
  return result;
}
async function pendingFor(
  tabId: number,
  url?: string,
): Promise<Pending | null> {
  const { pending } = await chrome.storage.session.get("pending");
  const value = pending as Pending | undefined;
  if (!value || value.tabId !== tabId || Date.now() - value.at > 60_000)
    return null;
  if (url && new URL(url).origin !== new URL(value.url).origin) return null;
  return value;
}
async function handle(
  message: Message,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (!message || typeof message.type !== "string")
    throw new Error("Invalid message");
  if (
    ["TOUCH", "FILL_ACTIVE"].includes(message.type) &&
    !sender.url?.startsWith(chrome.runtime.getURL(""))
  )
    throw new Error("Extension page required");
  if (sender.frameId && sender.frameId !== 0)
    throw new Error("Top-level page required");
  if (message.type === "TOUCH") {
    await state();
    await touch();
    return { ok: true };
  }
  if (message.type === "FILL_ACTIVE") {
    if (!message.itemId) throw new Error("Missing item");
    const tab = await activeTab();
    return fill(message.itemId, tab.url!, tab.id!);
  }
  const tabId = sender.tab?.id;
  const pageUrl = sender.url || sender.tab?.url || "";
  if (!tabId || !pageUrl) throw new Error("Website context required");
  if (message.type === "GET_OPTIONS") {
    const data = await entries();
    await touch();
    return data.values
      .filter((value) => matchesDomain(pageUrl, value.record.url))
      .map((value) => ({
        id: value.item.id,
        title: value.record.title,
        username: value.record.username,
      }));
  }
  if (message.type === "FILL_ITEM") {
    if (!message.itemId) throw new Error("Missing item");
    return fill(message.itemId, pageUrl);
  }
  if (message.type === "CAPTURE") {
    const page = new URL(pageUrl);
    if (page.protocol !== "https:" && page.hostname !== "localhost")
      return { skip: true };
    if (
      typeof message.username !== "string" ||
      typeof message.password !== "string" ||
      !message.username ||
      !message.password ||
      message.username.length > 500 ||
      message.password.length > 5000
    )
      return { skip: true };
    const data = await entries();
    const existing = data.values.find(
      (value) =>
        value.record.username === message.username &&
        matchesDomain(pageUrl, value.record.url),
    );
    if (existing && existing.item.role === "VIEWER") return { skip: true };
    if (existing?.record.password === message.password) return { skip: true };
    const pending: Pending = {
      tabId,
      url: pageUrl,
      username: message.username,
      password: message.password,
      at: Date.now(),
      updateId: existing?.item.id,
      collectionId: existing?.item.collectionId,
    };
    await chrome.storage.session.set({ pending });
    await touch();
    await chrome.alarms.create("capture-expire", { when: Date.now() + 60_000 });
    return { prompt: true, update: !!existing };
  }
  if (message.type === "GET_DESTINATIONS") {
    const data = await state();
    const pending = await pendingFor(tabId, pageUrl);
    const collections = await teamCollections(data.token, data.userId);
    return {
      destinations: [
        { id: "", label: "Personal vault" },
        ...collections.map(({ id, label }) => ({ id, label })),
      ],
      selectedId: pending?.updateId ? pending.collectionId || "" : "",
    };
  }
  if (message.type === "READY") {
    const pending = await pendingFor(tabId, pageUrl);
    return pending
      ? { prompt: true, update: !!pending.updateId }
      : { prompt: false };
  }
  if (message.type === "DISMISS_CAPTURE") {
    const pending = await pendingFor(tabId, pageUrl);
    if (pending) await chrome.storage.session.remove("pending");
    return { ok: true };
  }
  if (message.type === "SAVE_CAPTURE") {
    const pending = await pendingFor(tabId, pageUrl);
    if (!pending) throw new Error("Save prompt expired");
    const data = await entries();
    if (pending.updateId) {
      const found = data.values.find(
        (value) => value.item.id === pending.updateId,
      );
      if (!found || found.item.role === "VIEWER")
        throw new Error("Credential no longer editable");
      const raw = await itemKey(found.item, data.keys);
      const next: VaultRecord = { ...found.record, password: pending.password };
      const encrypted = await encryptRecord(next, raw);
      await request(data.token, `/items/${found.item.id}`, "PUT", {
        ...encrypted,
        version: found.item.version,
      });
    } else {
      const info = await request<CryptoInfo>(data.token, "/auth/crypto");
      const url = new URL(pending.url).origin;
      const record: VaultRecord = {
        title: new URL(pending.url).hostname,
        username: pending.username,
        password: pending.password,
        url,
        category: "Personal",
        notes: "",
      };
      const encrypted = await newItem(record, info.publicKey);
      const collectionId = message.collectionId || null;
      const collections = await teamCollections(data.token, data.userId);
      const destination = collectionId
        ? collections.find((collection) => collection.id === collectionId)
        : undefined;
      if (collectionId && !destination)
        throw new Error("Selected team collection is unavailable");
      const collectionGrants = destination
        ? await Promise.all(
            destination.members.map(async (member) => ({
              userId: member.id,
              wrappedKey: await wrapForUser(encrypted.rawKey, member.publicKey),
              role: member.role === "OWNER" ? "ADMIN" : member.role,
            })),
          )
        : [];
      await request(data.token, "/items", "POST", {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        ownerWrappedKey: encrypted.ownerWrappedKey,
        collectionId,
        collectionGrants,
      });
    }
    await chrome.storage.session.remove("pending");
    await touch();
    return { ok: true };
  }
  throw new Error("Unknown message");
}
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    void handle(message, sender)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          error: error instanceof Error ? error.message : "Extension error",
        }),
      );
    return true;
  },
);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "auto-lock") {
    void chrome.storage.session.get("lastActive").then(({ lastActive }) => {
      if (isLocked(lastActive))
        return chrome.storage.session.remove([
          "privateKey",
          "lastActive",
          "pending",
        ]);
    });
  }
  if (alarm.name === "capture-expire")
    void chrome.storage.session.remove("pending");
});
chrome.tabs.onRemoved.addListener((tabId) => {
  void pendingFor(tabId).then((pending) => {
    if (pending) return chrome.storage.session.remove("pending");
  });
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status !== "complete") return;
  void pendingFor(tabId).then((pending) => {
    if (pending)
      return chrome.tabs
        .sendMessage(tabId, { type: "SHOW_PROMPT", update: !!pending.updateId })
        .catch(() => undefined);
  });
});
void chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
