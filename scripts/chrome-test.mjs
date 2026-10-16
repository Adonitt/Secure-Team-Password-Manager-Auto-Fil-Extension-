// Uses the installed Google Chrome in an isolated, temporary profile.
import { chromium, expect } from "@playwright/test";
import { resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { request } from "../shared/api.ts";
import { unlock, decryptRecord } from "../shared/crypto.ts";

await mkdir("test-results", { recursive: true });
const context = await chromium.launchPersistentContext("", {
  channel: "chrome",
  ignoreDefaultArgs: ["--disable-extensions"],
  headless: process.env.HEADED !== "1",
  viewport: { width: 1440, height: 1000 },
  args: ["--enable-unsafe-extension-debugging"],
});
context.setDefaultTimeout(15_000);
const suffix = crypto.randomUUID().slice(0, 8);
const email = `chrome-owner-${suffix}@example.test`;
const guestEmail = `chrome-guest-${suffix}@example.test`;
const account = "demo-account-password-123";
const master = "demo-master-password-456";
const savedPassword = `synthetic-browser-secret-${suffix}`;
const errors = [];
const checks = [];
const page = context.pages()[0] || (await context.newPage());
page.on("pageerror", (error) => errors.push(error.message));
async function register(target, userEmail) {
  await target.goto("http://localhost:5174");
  await target
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await target.getByLabel("First name", { exact: true }).fill("Chrome");
  await target.getByLabel("Last name", { exact: true }).fill("Tester");
  await target.getByLabel("Email", { exact: true }).fill(userEmail);
  await target.getByLabel("Account password", { exact: true }).fill(account);
  await target
    .getByLabel("Confirm account password", { exact: true })
    .fill(account);
  await target.getByLabel("Master password", { exact: true }).fill(master);
  await target
    .getByLabel("Confirm master password", { exact: true })
    .fill(master);
  await target
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    target.getByRole("heading", { name: "Vault", exact: true }),
  ).toBeVisible();
}
async function reloadVault(target) {
  const closeDetails = target.getByRole("button", { name: "Close details", exact: true });
  if (await closeDetails.count()) await closeDetails.click();
  await target.getByRole("button", { name: "Lock", exact: true }).click();
  await target.getByLabel("Master password", { exact: true }).fill(master);
  await target.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    target.getByRole("heading", { name: "Vault", exact: true }),
  ).toBeVisible();
}
async function choose(target, title) {
  await target
    .locator(".entry-table tbody tr")
    .filter({ hasText: title })
    .getByRole("button", { name: new RegExp(`View details for ${title}`) })
    .click();
}
try {
  const browser = context.browser();
  const version = browser.version();
  console.log(`Testing installed Google Chrome ${version}`);
  await register(page, email);
  await page.getByRole("button", { name: "New credential", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Chrome demo login");
  await page
    .getByLabel("Website URL", { exact: true })
    .fill("http://localhost:8083");
  await page
    .getByLabel("Username / email", { exact: true })
    .fill("demo-user@example.test");
  await page.getByLabel("Password", { exact: true }).fill(savedPassword);
  await page
    .getByLabel("Category", { exact: true })
    .last()
    .selectOption("Work");
  await page
    .getByLabel("Secure notes", { exact: true })
    .fill("Private browser-test note");
  await page
    .getByLabel("TOTP secret (optional)", { exact: true })
    .fill("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  const upload = page.waitForRequest(
    (req) => req.url().endsWith("/items") && req.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save credential", exact: true })
    .click();
  const payload = (await upload).postData();
  for (const plaintext of [
    savedPassword,
    "Chrome demo login",
    "Private browser-test note",
    master,
  ]) {
    expect(payload).not.toContain(plaintext);
  }
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(1);
  checks.push("Web registration and client-encrypted credential creation");
  await page.getByLabel("Search credentials").fill("CHROME");
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(1);
  await page.getByLabel("Filter by category").selectOption("Work");
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(1);
  await page.getByLabel("Filter by category").selectOption("All");
  await page.getByLabel("Search credentials").fill("");
  await choose(page, "Chrome demo login");
  await expect(page.locator(".record-context")).toContainText(email);
  await page.getByLabel("Filter by access").selectOption("SHARED");
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(0);
  await page.getByLabel("Filter by access").selectOption("OWNED");
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(1);
  await page.getByLabel("Filter by access").selectOption("ALL");
  await page.screenshot({
    path: "test-results/vault-chrome.png",
    fullPage: true,
  });
  checks.push("Search and category filtering");
  await page.getByRole("button", { name: "Close details", exact: true }).click();
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await page
    .getByLabel("Master password", { exact: true })
    .fill("wrong-master-password");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByText("Incorrect master password or damaged vault metadata"),
  ).toBeVisible();
  await page.getByLabel("Master password", { exact: true }).fill(master);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(1);
  checks.push("Manual lock, rejected wrong master password and local unlock");

  const guestContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const guest = await guestContext.newPage();
  await register(guest, guestEmail);
  await choose(page, "Chrome demo login");
  const shareSearch = page.getByLabel("Search users to share with", {
    exact: true,
  });
  await shareSearch.fill(`missing-${suffix}@example.test`);
  await expect(page.getByText("No user found", { exact: true })).toBeVisible();
  await shareSearch.fill(guestEmail);
  await expect(
    page.locator(".user-suggestions button").filter({ hasText: guestEmail }),
  ).toBeVisible();
  await page
    .locator(".user-suggestions button")
    .filter({ hasText: guestEmail })
    .click();
  await expect(shareSearch).toHaveValue(guestEmail);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(
    page.locator(".grant-row").filter({ hasText: guestEmail }),
  ).toBeVisible();
  await reloadVault(guest);
  await choose(guest, "Chrome demo login");
  await expect(guest.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await expect(
    guest.getByRole("button", { name: "Save credential", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".grant-row")
    .filter({ hasText: guestEmail })
    .locator("select")
    .selectOption("EDITOR");
  await expect(
    page.getByText("Sharing permission updated", { exact: true }),
  ).toBeVisible();
  await reloadVault(guest);
  await choose(guest, "Chrome demo login");
  await guest.getByRole("button", { name: "Edit", exact: true }).click();
  await guest
    .getByLabel("Secure notes", { exact: true })
    .fill("Edited by the invited user");
  await guest
    .getByRole("button", { name: "Save credential", exact: true })
    .click();
  await expect(
    guest.getByText("Credential updated", { exact: true }),
  ).toBeVisible();
  await choose(guest, "Chrome demo login");
  await expect(guest.getByText("Edited by the invited user", { exact: true })).toBeVisible();
  await reloadVault(page);
  await choose(page, "Chrome demo login");
  await expect(page.getByText("Edited by the invited user", { exact: true })).toBeVisible();
  checks.push("Direct sharing and Viewer/Editor UI permissions");

  await page.getByRole("button", { name: "Close details", exact: true }).click();
  await page.getByRole("button", { name: "Teams", exact: true }).click();
  await page.getByPlaceholder("New team name").fill("Browser demo team");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByPlaceholder("Collection name").fill("Team logins");
  await page.getByRole("button", { name: "Add folder", exact: true }).click();
  await expect(page.getByText("Team logins", { exact: true })).toBeVisible();
  const teamMemberSearch = page.getByLabel("Search users to add to team", {
    exact: true,
  });
  await teamMemberSearch.fill(`missing-team-${suffix}@example.test`);
  await expect(page.getByText("No user found", { exact: true })).toBeVisible();
  await teamMemberSearch.fill(guestEmail);
  await expect(
    page.locator('.user-suggestions button').filter({ hasText: guestEmail }),
  ).toBeVisible();
  await page
    .locator('.user-suggestions button')
    .filter({ hasText: guestEmail })
    .click();
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await expect(
    page.locator(".simple-row").filter({ hasText: guestEmail }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vault", exact: true }).click();
  await page.getByRole("button", { name: "New credential", exact: true }).click();
  await expect(
    page.getByLabel("Vault package", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page
    .getByLabel("Title", { exact: true })
    .fill("Shared team credential");
  await page
    .getByLabel("Website URL", { exact: true })
    .fill("https://example.com");
  await page
    .getByLabel("Username / email", { exact: true })
    .fill("team-user@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-team-secret");
  await page
    .getByLabel("Vault package", { exact: true })
    .selectOption({ label: "Browser demo team" });
  await page
    .getByLabel("Collection", { exact: true })
    .selectOption({ label: "Team logins" });
  await page
    .getByRole("button", { name: "Save credential", exact: true })
    .click();
  await expect(page.locator(".entry-table tbody tr")).toHaveCount(2);
  await choose(page, "Shared team credential");
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  await expect(
    page.getByText(
      "Direct sharing is disabled because this credential is in a team collection.",
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details", exact: true }).click();
  await reloadVault(guest);
  await expect(guest.locator(".entry-table tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Teams", exact: true }).click();
  await page.getByLabel(`Role for ${guestEmail}`).selectOption("EDITOR");
  await expect(
    page.getByText("Member role updated", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".simple-row")
    .filter({ hasText: guestEmail })
    .getByRole("button", { name: `Remove ${guestEmail} from team`, exact: true })
    .click();
  await expect(
    page.getByText("Member removed; item keys rotated", { exact: true }),
  ).toBeVisible();
  await reloadVault(guest);
  await expect(guest.locator(".entry-table tbody tr")).toHaveCount(1);
  checks.push("Team collections, membership role changes and revocation");

  await page
    .getByRole("button", { name: "Import & export", exact: true })
    .click();
  await page.getByLabel("File", { exact: true }).setInputFiles({
    name: "chrome.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,url,username,password\nImported login,https://example.org,test-user,synthetic-import-password",
    ),
  });
  await page
    .getByRole("button", { name: "Import into personal vault", exact: true })
    .click();
  await expect(
    page.getByText("Imported 1 credentials", { exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported.items.some((item) => item.title === "Imported login")).toBe(
    true,
  );
  checks.push("Chrome CSV import and downloadable JSON export");

  const cdp = await browser.newBrowserCDPSession();
  const { id: extensionId } = await cdp.send("Extensions.loadUnpacked", {
    path: resolve("extension/dist"),
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByLabel("Email", { exact: true }).fill(email);
  await popup.getByLabel("Account password", { exact: true }).fill(account);
  await popup.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    popup.getByRole("heading", { name: "Unlock vault" }),
  ).toBeVisible();
  await popup.getByLabel("Master password", { exact: true }).fill(master);
  await popup.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(popup.locator(".item")).toHaveCount(3);
  const demo = await context.newPage();
  await demo.goto("http://localhost:8083");
  await expect(demo.locator("[data-team-vault-icon]")).toHaveCount(2);
  await demo.locator('[data-team-vault-icon="password"]').click();
  await demo
    .locator("[data-team-vault-menu]")
    .getByRole("button", { name: /Chrome demo login/ })
    .click();
  await expect(demo.getByLabel("Email / username")).toHaveValue(
    "demo-user@example.test",
  );
  await expect(demo.getByLabel("Password", { exact: true })).toHaveValue(
    savedPassword,
  );
  await demo.screenshot({
    path: "test-results/autofill-chrome.png",
    fullPage: true,
  });
  checks.push("Google Chrome extension login, unlock and inline autofill");
  await demo
    .getByLabel("Password", { exact: true })
    .fill("synthetic-updated-password");
  await demo.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    demo.getByText("Update saved password?", { exact: true }),
  ).toBeVisible();
  await demo
    .locator("[data-team-vault-prompt]")
    .getByRole("button", { name: "Update", exact: true })
    .click();
  await expect(demo.locator("[data-team-vault-prompt]")).toHaveCount(0);
  await demo
    .getByLabel("Email / username")
    .fill("captured-new-user@example.test");
  await demo
    .getByLabel("Password", { exact: true })
    .fill("synthetic-captured-password");
  await demo.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    demo.getByText("Save login to Team Vault?", { exact: true }),
  ).toBeVisible();
  await demo
    .locator("[data-team-vault-prompt]")
    .getByLabel("Vault package", { exact: true })
    .selectOption({ label: "Browser demo team" });
  await demo
    .locator("[data-team-vault-prompt]")
    .getByLabel("Vault destination", { exact: true })
    .selectOption({ label: "Team logins" });
  await demo
    .locator("[data-team-vault-prompt]")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(demo.locator("[data-team-vault-prompt]")).toHaveCount(0);
  const session = await request(null, "/auth/login", "POST", {
    email,
    accountPassword: account,
  });
  const info = await request(session.token, "/auth/crypto");
  const keys = await unlock(master, info);
  const items = await request(session.token, "/items");
  const records = await Promise.all(
    items.map((item) => decryptRecord(item, keys)),
  );
  expect(
    records.some((record) => record.password === "synthetic-updated-password"),
  ).toBe(true);
  expect(
    records.some(
      (record) => record.username === "captured-new-user@example.test",
    ),
  ).toBe(true);
  const teams = await request(session.token, "/workspaces");
  const team = teams.find((value) => value.name === "Browser demo team");
  const teamDetails = await request(session.token, `/workspaces/${team.id}`);
  const teamCollection = teamDetails.collections.find(
    (collection) => collection.name === "Team logins",
  );
  const capturedIndex = records.findIndex(
    (record) => record.username === "captured-new-user@example.test",
  );
  expect(items[capturedIndex]?.collectionId).toBe(teamCollection?.id);
  checks.push(
    "Extension Update and Save capture prompts persist encrypted records",
  );

  await popup.reload();
  await expect(popup.locator(".item")).toHaveCount(4);
  // Simulate elapsed inactivity instead of making the test wait ten minutes.
  await popup.evaluate(async () => {
    await chrome.storage.session.set({ lastActive: Date.now() - 10 * 60_000 });
  });
  await demo.locator('[data-team-vault-icon="password"]').click();
  await expect(
    demo.getByText("Vault is locked. Open the extension to unlock it."),
  ).toBeVisible();
  await expect(
    popup.getByRole("heading", { name: "Unlock vault" }),
  ).toBeVisible();
  expect(
    await popup.evaluate(
      async () => (await chrome.storage.session.get("privateKey")).privateKey,
    ),
  ).toBeUndefined();
  expect(
    await popup.evaluate(async () =>
      Object.keys(await chrome.storage.local.get(null)),
    ),
  ).toEqual([]);
  checks.push(
    "Auto-lock clears the key and popup plaintext; no secrets in persistent extension storage",
  );

  await popup.getByRole("button", { name: "Sign out", exact: true }).click();
  await popup.getByLabel("Email", { exact: true }).fill(guestEmail);
  await popup.getByLabel("Account password", { exact: true }).fill(account);
  await popup.getByRole("button", { name: "Sign in", exact: true }).click();
  await popup.getByLabel("Master password", { exact: true }).fill(master);
  await popup.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(popup.locator(".item")).toHaveCount(1);
  await demo.locator("[data-team-vault-menu]").click();
  await demo.getByLabel("Email / username").fill("");
  await demo.getByLabel("Password", { exact: true }).fill("");
  await demo.locator('[data-team-vault-icon="password"]').click();
  await demo
    .locator("[data-team-vault-menu]")
    .getByRole("button", { name: /Chrome demo login/ })
    .click();
  await expect(demo.getByLabel("Password", { exact: true })).toHaveValue(
    "synthetic-updated-password",
  );
  checks.push(
    "Shared credential autofill through the guest user's private key",
  );

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await popup.bringToFront();
  const sharedCard = popup
    .locator(".item")
    .filter({ hasText: "Chrome demo login" });
  await sharedCard
    .getByRole("button", { name: "Username", exact: true })
    .click();
  await expect(
    popup.getByText("Username copied", { exact: true }),
  ).toBeVisible();
  expect(await popup.evaluate(() => navigator.clipboard.readText())).toBe(
    "demo-user@example.test",
  );
  await sharedCard
    .getByRole("button", { name: "Password", exact: true })
    .click();
  await expect(
    popup.getByText("Password copied", { exact: true }),
  ).toBeVisible();
  expect(await popup.evaluate(() => navigator.clipboard.readText())).toBe(
    "synthetic-updated-password",
  );
  await sharedCard.getByRole("button", { name: "TOTP", exact: true }).click();
  await expect(popup.getByText("TOTP copied", { exact: true })).toBeVisible();
  expect(await popup.evaluate(() => navigator.clipboard.readText())).toMatch(
    /^\d{6}$/,
  );
  checks.push("Chrome popup quick-copy of username, password and TOTP");

  expect(errors).toEqual([]);
  await writeFile(
    "test-results/chrome-report.json",
    JSON.stringify(
      { browser: `Google Chrome ${version}`, checks, status: "passed" },
      null,
      2,
    ),
  );
  console.log(`PASS: ${checks.length} Chrome flows verified`);
  for (const check of checks) console.log(`  ✓ ${check}`);
  await guestContext.close();
  await request(session.token, "/auth/logout", "POST");
} catch (error) {
  for (const [index, target] of context.pages().entries()) {
    if (target.url().startsWith("chrome-extension://")) {
      console.error(
        "Extension view:",
        await target
          .locator("body")
          .innerText()
          .catch(() => "unavailable"),
      );
      await target
        .screenshot({ path: `test-results/extension-failure-${index}.png` })
        .catch(() => {});
    }
  }
  await page
    .screenshot({ path: "test-results/chrome-failure.png", fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await context.close();
}
