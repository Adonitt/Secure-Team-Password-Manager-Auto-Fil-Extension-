import type { CryptoInfo, Grant, Item, VaultRecord } from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITERATIONS = 600_000;
type Cipher = { iv: string; data: string };
export type Unlocked = { privateKey: CryptoKey };

export function b64(data: Uint8Array | ArrayBuffer): string {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  let text = "";
  for (const byte of view) text += String.fromCharCode(byte);
  return btoa(text);
}
export function unb64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
export function random(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}
function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function aes(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buffer(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
async function derive(master: string, salt: Uint8Array): Promise<CryptoKey> {
  // This key is derived locally; neither it nor the master password goes to the API.
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(master),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: buffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function seal(data: Uint8Array, key: CryptoKey): Promise<Cipher> {
  // GCM needs a fresh nonce on every encryption, including edits of the same item.
  const iv = random(12);
  const result = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv) },
    key,
    buffer(data),
  );
  return { iv: b64(iv), data: b64(result) };
}
async function open(cipher: Cipher, key: CryptoKey): Promise<Uint8Array> {
  const result = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buffer(unb64(cipher.iv)) },
    key,
    buffer(unb64(cipher.data)),
  );
  return new Uint8Array(result);
}
async function publicKey(encoded: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    buffer(unb64(encoded)),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}
export async function createCrypto(master: string): Promise<CryptoInfo> {
  if (master.length < 12)
    throw new Error("Master password needs at least 12 characters");
  const salt = random(16);
  const masterKey = await derive(master, salt);
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const pub = await crypto.subtle.exportKey("spki", pair.publicKey);
  const priv = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", pair.privateKey),
  );
  const encryptedPrivateKey = JSON.stringify(await seal(priv, masterKey));
  priv.fill(0);
  return {
    kdfSalt: b64(salt),
    publicKey: b64(pub),
    encryptedPrivateKey,
  };
}
export async function unlock(
  master: string,
  info: CryptoInfo,
  extractable = false,
): Promise<Unlocked> {
  try {
    const masterKey = await derive(master, unb64(info.kdfSalt));
    const bytes = await open(
      JSON.parse(info.encryptedPrivateKey) as Cipher,
      masterKey,
    );
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      buffer(bytes),
      { name: "RSA-OAEP", hash: "SHA-256" },
      extractable,
      ["decrypt"],
    );
    bytes.fill(0);
    return { privateKey };
  } catch {
    throw new Error("Incorrect master password or damaged vault metadata");
  }
}
export async function exportPrivateKey(unlocked: Unlocked): Promise<string> {
  return b64(await crypto.subtle.exportKey("pkcs8", unlocked.privateKey));
}
export async function importPrivateKey(encoded: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    buffer(unb64(encoded)),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}
export function withPrivateKey(privateKey: CryptoKey): Unlocked {
  return { privateKey };
}
export async function wrapForUser(
  rawKey: Uint8Array,
  encodedPublicKey: string,
): Promise<string> {
  // Hybrid encryption: RSA protects the small item key; AES protects the record.
  return b64(
    await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      await publicKey(encodedPublicKey),
      buffer(rawKey),
    ),
  );
}
export async function itemKey(
  item: Item | Grant,
  unlocked: Unlocked,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      unlocked.privateKey,
      buffer(unb64(item.wrappedKey)),
    ),
  );
}
export async function encryptRecord(
  record: VaultRecord,
  rawKey: Uint8Array,
): Promise<{ ciphertext: string; nonce: string }> {
  const payload = await seal(
    enc.encode(JSON.stringify(record)),
    await aes(rawKey),
  );
  return { ciphertext: payload.data, nonce: payload.iv };
}
export async function decryptRecord(
  item: Item,
  unlocked: Unlocked,
): Promise<VaultRecord> {
  const raw = await itemKey(item, unlocked);
  return decryptWithKey(item, raw);
}
export async function decryptWithKey(
  item: Pick<Item, "ciphertext" | "nonce">,
  rawKey: Uint8Array,
): Promise<VaultRecord> {
  return JSON.parse(
    dec.decode(
      await open({ iv: item.nonce, data: item.ciphertext }, await aes(rawKey)),
    ),
  ) as VaultRecord;
}
export async function newItem(
  record: VaultRecord,
  ownerPublicKey: string,
): Promise<{
  ciphertext: string;
  nonce: string;
  ownerWrappedKey: string;
  rawKey: Uint8Array;
}> {
  const rawKey = random(32);
  const encrypted = await encryptRecord(record, rawKey);
  return {
    ...encrypted,
    ownerWrappedKey: await wrapForUser(rawKey, ownerPublicKey),
    rawKey,
  };
}
export async function rekeyItem(record: VaultRecord, grants: Grant[]) {
  const rawKey = random(32);
  const payload = await encryptRecord(record, rawKey);
  const nextGrants = await Promise.all(
    grants.map(async (grant) => ({
      userId: grant.userId,
      wrappedKey: await wrapForUser(rawKey, grant.publicKey),
      role: grant.role,
      source: grant.source,
    })),
  );
  return { ...payload, grants: nextGrants };
}
