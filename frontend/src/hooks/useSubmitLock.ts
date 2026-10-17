import { useRef, useState } from "react";

/**
 * Guard against double-submit. The ref blocks a second click before React
 * re-renders with `busy = true`, so rapid double-clicks run the action once.
 */
export function useSubmitLock() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return { busy, run };
}
