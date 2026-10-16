type Reply = {
  error?: string;
  prompt?: boolean;
  update?: boolean;
  packages?: {
    id: string;
    label: string;
    collections: { id: string; label: string }[];
  }[];
  selectedId?: string | null;
  username?: string;
  password?: string;
  id?: string;
  title?: string;
  skip?: boolean;
};
const enhanced = new WeakSet<HTMLInputElement>();
const icons = new Map<HTMLInputElement, HTMLButtonElement>();
const ownApp = location.hostname === "localhost" && location.port === "5174";
let menu: HTMLElement | null = null;
let savePrompt: HTMLElement | null = null;
let lastCapture = "";

function passwordFields(): HTMLInputElement[] {
  if (ownApp) return [];
  return [
    ...document.querySelectorAll<HTMLInputElement>('input[type="password"]'),
  ].filter((input) => !input.disabled && input.offsetParent !== null);
}
function usernameField(password: HTMLInputElement): HTMLInputElement | null {
  const form = password.form || password.closest("form") || document;
  const candidates = [
    ...form.querySelectorAll<HTMLInputElement>(
      'input[type="email"],input[autocomplete="username"],input[type="text"]',
    ),
  ];
  return (
    candidates
      .filter(
        (input) =>
          !input.disabled &&
          input.compareDocumentPosition(password) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      )
      .at(-1) ||
    candidates[0] ||
    null
  );
}
function setValue(input: HTMLInputElement | null, value: string) {
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function closeMenu() {
  menu?.remove();
  menu = null;
}
function showOptions(field: HTMLInputElement) {
  closeMenu();
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;z-index:2147483647;min-width:230px;max-width:320px;background:white;color:#17212d;border:1px solid #b7c5d8;border-radius:9px;box-shadow:0 9px 28px #0003;padding:6px;font:13px system-ui";
  const rect = field.getBoundingClientRect();
  box.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 325))}px`;
  box.style.top = `${Math.min(rect.bottom + 5, window.innerHeight - 100)}px`;
  const heading = document.createElement("div");
  heading.textContent = "Team Vault";
  heading.style.cssText = "font-weight:700;padding:5px;color:#2e6a52";
  box.setAttribute("data-team-vault-menu", "true");
  box.append(heading);
  document.documentElement.append(box);
  menu = box;
  void chrome.runtime
    .sendMessage({ type: "GET_OPTIONS" })
    .then((result: Reply[] | Reply) => {
      if (menu !== box) return;
      if (!Array.isArray(result)) {
        const row = document.createElement("div");
        row.textContent = result.error || "Unlock the vault in the extension";
        row.style.padding = "6px";
        box.append(row);
        return;
      }
      if (!result.length) {
        const row = document.createElement("div");
        row.textContent = "No matching credentials";
        row.style.padding = "6px";
        box.append(row);
        return;
      }
      for (const option of result) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${option.title || "Credential"} · ${option.username || ""}`;
        button.style.cssText =
          "display:block;width:100%;text-align:left;background:#f6f8fb;color:#17212d;border:0;border-radius:5px;margin:3px 0;padding:7px;cursor:pointer;font:13px system-ui";
        button.addEventListener("click", (event) => {
          if (!event.isTrusted) return;
          void chrome.runtime
            .sendMessage({ type: "FILL_ITEM", itemId: option.id })
            .then((filled: Reply) => {
              if (filled.error) {
                button.textContent = filled.error;
                return;
              }
              setValue(usernameField(field), filled.username || "");
              setValue(field, filled.password || "");
              closeMenu();
            });
        });
        box.append(button);
      }
    })
    .catch(() => {
      closeMenu();
    });
}
function positionIcons() {
  for (const [input, button] of icons) {
    if (!input.isConnected) {
      button.remove();
      icons.delete(input);
      continue;
    }
    const rect = input.getBoundingClientRect();
    button.hidden =
      input.offsetParent === null || input.disabled || rect.width < 50;
    button.style.left = `${rect.right - 29}px`;
    button.style.top = `${rect.top + Math.max(0, (rect.height - 24) / 2)}px`;
  }
}
function enhance() {
  for (const password of passwordFields()) {
    const inputs = [password, usernameField(password)].filter(
      (input): input is HTMLInputElement => !!input,
    );
    for (const input of inputs) {
      if (enhanced.has(input)) continue;
      enhanced.add(input);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "◆";
      button.setAttribute("aria-label", "Choose a Team Vault credential");
      button.setAttribute(
        "data-team-vault-icon",
        input.type === "password" ? "password" : "username",
      );
      button.style.cssText =
        "position:fixed;z-index:2147483646;width:24px;height:24px;padding:0;border:0;border-radius:5px;background:#e2efe8;color:#2e6a52;font:14px system-ui;cursor:pointer";
      input.style.paddingRight = `${Math.max(32, parseFloat(getComputedStyle(input).paddingRight) || 0)}px`;
      button.addEventListener("click", (event) => {
        if (event.isTrusted) showOptions(password);
      });
      icons.set(input, button);
      document.documentElement.append(button);
    }
  }
  positionIcons();
}
window.addEventListener("scroll", positionIcons, {
  capture: true,
  passive: true,
});
window.addEventListener("resize", positionIcons);
document.addEventListener("focusin", positionIcons);
function showPrompt(update: boolean) {
  if (ownApp) return;
  savePrompt?.remove();
  const box = document.createElement("div");
  savePrompt = box;
  box.setAttribute("data-team-vault-prompt", "true");
  box.style.cssText =
    "position:fixed;z-index:2147483647;right:16px;bottom:16px;width:310px;background:white;color:#17212d;padding:16px;border:1px solid #b7c5d8;border-radius:12px;box-shadow:0 12px 36px #0004;font:14px system-ui";
  const title = document.createElement("strong");
  title.textContent = update
    ? "Update saved password?"
    : "Save login to Team Vault?";
  const note = document.createElement("p");
  note.textContent = "Only saved after you choose Save.";
  note.style.margin = "8px 0 12px";
  const packageLabel = document.createElement("label");
  packageLabel.textContent = update ? "Saved in" : "Save in";
  packageLabel.style.cssText =
    "display:grid;gap:5px;margin:8px 0 12px;font-size:12px;font-weight:600";
  const packageSelect = document.createElement("select");
  packageSelect.setAttribute("aria-label", "Vault package");
  packageSelect.style.cssText =
    "width:100%;padding:7px;border:1px solid #b7c5d8;border-radius:6px;background:white;color:#17212d;font:13px system-ui";
  packageLabel.append(packageSelect);
  const collectionLabel = document.createElement("label");
  collectionLabel.textContent = "Collection";
  collectionLabel.style.cssText =
    "display:none;gap:5px;margin:8px 0 12px;font-size:12px;font-weight:600";
  const collectionSelect = document.createElement("select");
  collectionSelect.setAttribute("aria-label", "Vault destination");
  collectionSelect.style.cssText =
    "width:100%;padding:7px;border:1px solid #b7c5d8;border-radius:6px;background:white;color:#17212d;font:13px system-ui";
  collectionLabel.append(collectionSelect);
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = update ? "Update" : "Save";
  save.style.cssText =
    "background:#2e6a52;color:white;border:0;border-radius:6px;padding:7px 12px;cursor:pointer";
  save.disabled = true;
  const later = document.createElement("button");
  later.type = "button";
  later.textContent = "Not now";
  later.style.cssText =
    "background:transparent;color:#2e6a52;border:0;margin-left:9px;cursor:pointer";
  save.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    void chrome.runtime
      .sendMessage({
        type: "SAVE_CAPTURE",
        collectionId: collectionSelect.value || null,
      })
      .then((result: Reply) => {
        if (result.error) {
          note.textContent = result.error;
          return;
        }
        box.remove();
        savePrompt = null;
      });
  });
  later.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    void chrome.runtime.sendMessage({ type: "DISMISS_CAPTURE" });
    box.remove();
    savePrompt = null;
  });
  box.append(title, note, packageLabel, collectionLabel, save, later);
  document.documentElement.append(box);
  void chrome.runtime
    .sendMessage({ type: "GET_DESTINATIONS" })
    .then((result: Reply) => {
      if (savePrompt !== box) return;
      if (result.error || !result.packages) {
        note.textContent = result.error || "No vault destinations available.";
        return;
      }
      const packages = result.packages;
      const personalValue = "__PERSONAL__";
      const personalOption = document.createElement("option");
      personalOption.value = personalValue;
      personalOption.textContent = "Personal vault";
      packageSelect.replaceChildren(
        personalOption,
        ...packages.map((team) => {
          const element = document.createElement("option");
          element.value = team.id;
          element.textContent = team.label;
          return element;
        }),
      );

      const renderCollections = (teamId: string) => {
        const team = packages.find((value) => value.id === teamId);
        if (!team) {
          collectionLabel.style.display = "none";
          collectionSelect.replaceChildren();
          collectionSelect.value = "";
          save.disabled = false;
          return;
        }
        collectionLabel.style.display = "grid";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose a collection…";
        collectionSelect.replaceChildren(
          placeholder,
          ...team.collections.map((collection) => {
            const element = document.createElement("option");
            element.value = collection.id;
            element.textContent = collection.label;
            return element;
          }),
        );
        collectionSelect.value = "";
        collectionSelect.disabled = update;
        save.disabled = !update;
      };

      packageSelect.addEventListener("change", () => {
        renderCollections(packageSelect.value);
      });
      collectionSelect.addEventListener("change", () => {
        save.disabled = !update && !collectionSelect.value;
      });

      const selectedTeam = packages.find((team) =>
        team.collections.some((collection) => collection.id === result.selectedId),
      );
      packageSelect.value = selectedTeam?.id || personalValue;
      if (selectedTeam) {
        renderCollections(selectedTeam.id);
        collectionSelect.value = result.selectedId || "";
      } else {
        renderCollections(personalValue);
      }
      packageSelect.disabled = update;
      collectionSelect.disabled = update || !selectedTeam;
      save.disabled = false;
    })
    .catch(() => {
      if (savePrompt === box) note.textContent = "Could not load vault destinations.";
    });
}
function captureForm(form: HTMLFormElement) {
  if (ownApp) return;
  const password = form.querySelector<HTMLInputElement>(
    'input[type="password"]',
  );
  if (!password?.value) return;
  const username = usernameField(password)?.value || "";
  if (!username) return;
  const fingerprint = `${username}\u0000${password.value}`;
  if (fingerprint === lastCapture) return;
  lastCapture = fingerprint;
  window.setTimeout(() => {
    if (lastCapture === fingerprint) lastCapture = "";
  }, 1500);
  void chrome.runtime
    .sendMessage({ type: "CAPTURE", username, password: password.value })
    .then((reply: Reply) => {
      if (reply.prompt) showPrompt(!!reply.update);
    })
    .catch(() => undefined);
}

document.addEventListener(
  "submit",
  (event) => {
    if (!event.isTrusted) return;
    const form = event.target;
    if (form instanceof HTMLFormElement) captureForm(form);
  },
  true,
);

// Some single-page login screens (including common social sites) handle the
// button with JavaScript and never dispatch a native form submit event.
document.addEventListener(
  "click",
  (event) => {
    if (ownApp || !event.isTrusted) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest(
      'button, input[type="submit"], [role="button"]',
    );
    const form = button?.closest("form");
    if (form) captureForm(form);
  },
  true,
);

document.addEventListener(
  "keydown",
  (event) => {
    if (ownApp || !event.isTrusted || event.key !== "Enter") return;
    const target = event.target;
    if (target instanceof Element) {
      const form = target.closest("form");
      if (form) captureForm(form);
    }
  },
  true,
);
chrome.runtime.onMessage.addListener(
  (message: Reply & { type: string }, _sender, respond) => {
    if (message.type === "FILL") {
      const field = passwordFields()[0];
      if (field) {
        setValue(usernameField(field), message.username || "");
        setValue(field, message.password || "");
      }
      respond({ ok: !!field });
    }
    if (message.type === "SHOW_PROMPT") showPrompt(!!message.update);
  },
);
document.addEventListener(
  "click",
  (event) => {
    if (menu && !menu.contains(event.target as Node)) closeMenu();
  },
  true,
);
if (!ownApp) {
  new MutationObserver(enhance).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  enhance();
  void chrome.runtime
    .sendMessage({ type: "READY" })
    .then((result: Reply) => {
      if (result.prompt) showPrompt(!!result.update);
    })
    .catch(() => undefined);
}
