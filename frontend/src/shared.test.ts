import { describe, expect, it } from "vitest";
import {
  createCrypto,
  b64,
  unb64,
  decryptRecord,
  decryptWithKey,
  itemKey,
  newItem,
  rekeyItem,
  unlock,
  wrapForUser,
} from "../../shared/crypto";
import {
  exportRecords,
  importRecords,
  matchesDomain,
  totp,
  validateVaultRecord,
} from "../../shared/helpers";
import type { Grant, Item, VaultRecord } from "../../shared/types";

const record: VaultRecord = {
  title: "Example",
  username: "person@example.com",
  password: "secret-123",
  url: "https://example.com/login",
  category: "Work",
  notes: "private note",
};

describe("client encryption and sharing", () => {
  it("keeps plaintext out of the stored payload and lets only wrapped-key holders decrypt", async () => {
    const ownerInfo = await createCrypto("owner-master-password");
    const guestInfo = await createCrypto("guest-master-password");
    const owner = await unlock("owner-master-password", ownerInfo);
    const guest = await unlock("guest-master-password", guestInfo);
    const created = await newItem(record, ownerInfo.publicKey);
    expect(created.ciphertext).not.toContain(record.password);
    expect(JSON.stringify(created)).not.toContain(record.notes);
    const item: Item = {
      id: "one",
      ownerId: "owner",
      ownerEmail: "owner@example.com",
      collectionId: null,
      version: 1,
      ciphertext: created.ciphertext,
      nonce: created.nonce,
      wrappedKey: created.ownerWrappedKey,
      wrapType: "RSA",
      role: "OWNER",
      hasDirectShares: false,
    };
    expect(await decryptRecord(item, owner)).toEqual(record);
    await expect(decryptRecord(item, guest)).rejects.toThrow();
    const tampered = unb64(item.ciphertext);
    tampered[0] ^= 1;
    await expect(
      decryptRecord({ ...item, ciphertext: b64(tampered) }, owner),
    ).rejects.toThrow();
    const shared: Item = {
      ...item,
      wrappedKey: await wrapForUser(created.rawKey, guestInfo.publicKey),
      role: "VIEWER",
    };
    expect(await decryptRecord(shared, guest)).toEqual(record);
    await expect(unlock("wrong-password", ownerInfo)).rejects.toThrow();
    const grants: Grant[] = [
      {
        userId: "owner",
        email: "owner@example.com",
        publicKey: ownerInfo.publicKey,
        wrappedKey: created.ownerWrappedKey,
        wrapType: "RSA",
        role: "OWNER",
        source: "OWNER",
      },
    ];
    const rotated = await rekeyItem(record, grants);
    await expect(
      decryptWithKey(rotated, await itemKey(shared, guest)),
    ).rejects.toThrow();
  });
});

describe("import, domain matching, and codes", () => {
  it("requires the main credential fields before encryption", () => {
    expect(() => validateVaultRecord({ ...record, password: "" })).toThrow(
      "Title, username and password are required",
    );
    expect(() => validateVaultRecord({ ...record, url: "" })).toThrow(
      "Website URL is required",
    );
    expect(() =>
      validateVaultRecord({ ...record, url: "http://github.com" }),
    ).toThrow("Use an HTTPS website URL");
    expect(() =>
      validateVaultRecord({ ...record, url: "http://localhost:8083" }),
    ).not.toThrow();
  });
  it("matches a saved registrable domain but not a lookalike or plain HTTP", () => {
    expect(
      matchesDomain("https://app.github.com/login", "https://github.com"),
    ).toBe(true);
    expect(
      matchesDomain("https://evilgithub.com/login", "https://github.com"),
    ).toBe(false);
    expect(matchesDomain("http://github.com/login", "https://github.com")).toBe(
      false,
    );
    expect(
      matchesDomain("https://accounts.example.co.uk", "https://example.co.uk"),
    ).toBe(true);
    expect(
      matchesDomain("http://localhost:8081/login", "http://localhost:5174"),
    ).toBe(false);
  });
  it("imports Chrome CSV and round-trips its own JSON including quoted notes", () => {
    const imported = importRecords(
      "name,url,username,password,note\nExample,https://example.com,user,pass,Chrome note",
      "chrome",
    );
    expect(imported).toHaveLength(1);
    expect(imported[0].notes).toBe("Chrome note");
    const withNotes = { ...imported[0], notes: 'hello, "team"' };
    expect(
      importRecords(exportRecords([withNotes], "json"), "teamvault-json"),
    ).toEqual([withNotes]);
    expect(
      importRecords(exportRecords([withNotes], "csv"), "onepassword")[0].notes,
    ).toBe(withNotes.notes);
    const bitwarden = importRecords(
      "type,name,login_uri,login_username,login_password,login_totp\nlogin,Demo,https://example.com,u,p,GEZDGNBVGY3TQOJQ",
      "bitwarden-csv",
    );
    expect(bitwarden[0].totpSecret).toBe("GEZDGNBVGY3TQOJQ");
    const onepassword = importRecords(
      'Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes\nExample,https://example.com,user,pass,GEZDGNBVGY3TQOJQ,false,false,Work,"Line one\nLine two"',
      "onepassword",
    );
    expect(onepassword[0].notes).toBe("Line one\nLine two");
    expect(onepassword[0].totpSecret).toBe("GEZDGNBVGY3TQOJQ");
    const bitwardenJson = importRecords(
      JSON.stringify({
        items: [
          {
            type: 1,
            name: "Example",
            notes: "Private note",
            login: {
              username: "user",
              password: "pass",
              uris: [{ uri: "https://example.com" }],
              totp: "GEZDGNBVGY3TQOJQ",
            },
          },
          { type: 2, name: "Not a login" },
        ],
      }),
      "bitwarden-json",
    );
    expect(bitwardenJson).toHaveLength(1);
    expect(bitwardenJson[0].username).toBe("user");
    expect(bitwardenJson[0].notes).toBe("Private note");
  });
  it("generates a standard six-digit TOTP", async () => {
    expect(await totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe(
      "287082",
    );
    expect(
      await totp(
        "otpauth://totp/Test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
        59_000,
      ),
    ).toBe("287082");
  });
});
