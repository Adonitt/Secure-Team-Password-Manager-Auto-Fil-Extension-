import { getDomain } from "tldts";
import type { VaultRecord } from "./types";

export function validateVaultRecord(record: VaultRecord): void {
  if (
    !record.title.trim() ||
    !record.username.trim() ||
    !record.password.trim()
  )
    throw new Error("Title, username and password are required");
  if (!record.url.trim()) throw new Error("Website URL is required");
  try {
    const url = new URL(record.url);
    if (
      (url.protocol !== "https:" && url.hostname !== "localhost") ||
      url.username ||
      url.password
    )
      throw new Error("Use an HTTPS website URL (or localhost for the demo)");
  } catch (error) {
    if (error instanceof Error && error.message !== "Invalid URL") throw error;
    throw new Error("Enter a valid website URL");
  }
  if (!record.category.trim()) throw new Error("Category is required");
}

export function matchesDomain(pageUrl: string, savedUrl: string): boolean {
  try {
    const page = new URL(pageUrl);
    const saved = new URL(
      savedUrl.includes("://") ? savedUrl : `https://${savedUrl}`,
    );
    if (
      (page.protocol !== "https:" && page.hostname !== "localhost") ||
      (saved.protocol !== "https:" && saved.hostname !== "localhost")
    )
      return false;
    if (
      page.username ||
      page.password ||
      saved.username ||
      saved.password ||
      page.port !== saved.port
    )
      return false;
    if (page.hostname === "localhost" || saved.hostname === "localhost")
      return page.origin === saved.origin;
    if (page.hostname === saved.hostname) return true;
    const pageDomain = getDomain(page.hostname, { allowPrivateDomains: true });
    const savedDomain = getDomain(saved.hostname, {
      allowPrivateDomains: true,
    });
    return (
      !!pageDomain &&
      pageDomain === savedDomain &&
      (saved.hostname === savedDomain ||
        page.hostname.endsWith(`.${saved.hostname}`))
    );
  } catch {
    return false;
  }
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw new Error("CSV has an unfinished quoted field");
  row.push(value);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
const blank = (): VaultRecord => ({
  title: "",
  username: "",
  password: "",
  url: "",
  category: "Personal",
  notes: "",
  totpSecret: "",
});
export function importRecords(
  text: string,
  kind:
    | "chrome"
    | "onepassword"
    | "bitwarden-csv"
    | "bitwarden-json"
    | "teamvault-json",
): VaultRecord[] {
  if (kind === "teamvault-json") {
    const parsed = JSON.parse(text) as {
      version?: number;
      items?: VaultRecord[];
    };
    if (parsed.version !== 1 || !Array.isArray(parsed.items))
      throw new Error("Unsupported Team Vault JSON export");
    return parsed.items.map((item) => ({
      ...blank(),
      title: String(item.title || ""),
      username: String(item.username || ""),
      password: String(item.password || ""),
      url: String(item.url || ""),
      category: String(item.category || "Personal"),
      notes: String(item.notes || ""),
      totpSecret: String(item.totpSecret || ""),
    }));
  }
  if (kind === "bitwarden-json") {
    const parsed = JSON.parse(text) as {
      items?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(parsed.items))
      throw new Error("Unsupported Bitwarden JSON export");
    return parsed.items
      .filter((item) => item.type === 1 && item.login)
      .map((item) => {
        const login = item.login as {
          username?: string;
          password?: string;
          uris?: { uri?: string }[];
          totp?: string;
        };
        return {
          ...blank(),
          title: String(item.name || ""),
          username: login.username || "",
          password: login.password || "",
          url: login.uris?.[0]?.uri || "",
          notes: String(item.notes || ""),
          totpSecret: login.totp || "",
        };
      });
  }
  const rows = parseCsv(text);
  const headers = (rows.shift() || []).map((x) =>
    x
      .trim()
      .toLowerCase()
      .replace(/^\uFEFF/, ""),
  );
  const field = (row: string[], ...names: string[]) => {
    const i = headers.findIndex((h) => names.includes(h));
    return i < 0 ? "" : row[i] || "";
  };
  return rows
    .map((row) => ({
      ...blank(),
      title: field(row, "name", "title"),
      username: field(row, "username", "login_username"),
      password: field(row, "password", "login_password"),
      url: field(row, "url", "website", "login_uri"),
      notes: field(row, "notes", "note", "login_notes"),
      category: field(row, "folder", "category") || "Personal",
      totpSecret: field(row, "totpsecret", "login_totp", "otpauth", "otp"),
    }))
    .filter((r, index) => {
      const type = field(rows[index], "type").toLowerCase();
      return (
        (!type || type === "login" || type === "1") &&
        (r.title || r.url || r.username)
      );
    });
}
function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
export function exportRecords(
  records: VaultRecord[],
  format: "csv" | "json",
): string {
  if (format === "json")
    return JSON.stringify({ version: 1, items: records }, null, 2);
  return [
    "title,username,password,url,category,notes,totpSecret",
    ...records.map((r) =>
      [
        r.title,
        r.username,
        r.password,
        r.url,
        r.category,
        r.notes,
        r.totpSecret || "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}

function base32(secret: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0,
    value = 0;
  const output: number[] = [];
  for (const char of secret.toUpperCase().replace(/[\s=-]/g, "")) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error("Invalid TOTP secret");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 255);
    }
  }
  return new Uint8Array(output);
}
export async function totp(secret: string, at = Date.now()): Promise<string> {
  if (secret.startsWith("otpauth://")) {
    const uri = new URL(secret);
    if (
      uri.hostname !== "totp" ||
      !["SHA1", "sha1"].includes(uri.searchParams.get("algorithm") || "SHA1") ||
      (uri.searchParams.get("digits") || "6") !== "6" ||
      (uri.searchParams.get("period") || "30") !== "30"
    )
      throw new Error(
        "This demo supports SHA1 TOTP with 6 digits and a 30-second period",
      );
    secret = uri.searchParams.get("secret") || "";
  }
  const raw = base32(secret);
  if (!raw.length) throw new Error("TOTP secret is required");
  const key = await crypto.subtle.importKey(
    "raw",
    raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength,
    ) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const counter = Math.floor(at / 30_000);
  const buffer = new ArrayBuffer(8),
    view = new DataView(buffer);
  view.setUint32(4, counter);
  const hash = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = hash[hash.length - 1] & 15;
  const value =
    ((hash[offset] & 127) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3];
  return String(value % 1_000_000).padStart(6, "0");
}
