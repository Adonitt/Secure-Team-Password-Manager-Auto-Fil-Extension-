import { useEffect, useRef } from "react";
import { AUTO_LOCK_MS } from "../../../shared/locking";
export function useAutoLock(active: boolean, lock: () => void) {
  const callback = useRef(lock);
  callback.current = lock;
  useEffect(() => {
    if (!active) return;
    let lastActivity = Date.now();
    const touch = () => {
      lastActivity = Date.now();
    };
    const check = () => {
      if (Date.now() - lastActivity >= AUTO_LOCK_MS) callback.current();
    };
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 10_000);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [active]);
}
