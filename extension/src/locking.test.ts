import { expect, it } from "vitest";
import { AUTO_LOCK_MS, isLocked } from "../../shared/locking";

it("locks at ten minutes of inactivity and stays unlocked after recent use", () => {
  const now = 1_000_000;
  expect(isLocked(undefined, now)).toBe(true);
  expect(isLocked(now - AUTO_LOCK_MS + 1, now)).toBe(false);
  expect(isLocked(now - AUTO_LOCK_MS, now)).toBe(true);
  expect(isLocked(now - 60_000, now)).toBe(false);
});
