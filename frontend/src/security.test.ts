import { describe, expect, it } from "vitest";
import { matchesDomain, importRecords, totp } from "../../shared/helpers";
import { AUTO_LOCK_MS, isLocked } from "../../shared/locking";
describe("security boundaries", () => {
  it("isolates private hosting tenants and different ports", () => {
    expect(
      matchesDomain("https://evil.github.io", "https://alice.github.io"),
    ).toBe(false);
    expect(matchesDomain("https://github.io", "https://github.io")).toBe(true);
    expect(matchesDomain("https://github.com:8443", "https://github.com")).toBe(
      false,
    );
    expect(
      matchesDomain("https://github.com.evil.test", "https://github.com"),
    ).toBe(false);
    expect(matchesDomain("https://github.com", "ftp://github.com")).toBe(false);
  });
  it("locks on invalid timestamps or inactivity", () => {
    expect(isLocked(undefined)).toBe(true);
    expect(isLocked(Date.now() + 60_000)).toBe(true);
    expect(isLocked(100, 100 + AUTO_LOCK_MS)).toBe(true);
  });
  it("rejects malformed imports and unsupported TOTP settings", async () => {
    expect(() => importRecords('{"items":null}', "bitwarden-json")).toThrow();
    expect(() =>
      importRecords('name,password\n"unfinished', "chrome"),
    ).toThrow();
    await expect(
      totp("otpauth://totp/Test?secret=GEZDGNBVGY3TQOJQ&digits=8"),
    ).rejects.toThrow();
  });
});
