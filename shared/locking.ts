export const AUTO_LOCK_MS = 10 * 60_000;
export function isLocked(lastActive: unknown, now = Date.now()): boolean {
  return (
    typeof lastActive !== "number" ||
    !Number.isFinite(lastActive) ||
    lastActive > now ||
    now - lastActive >= AUTO_LOCK_MS
  );
}
