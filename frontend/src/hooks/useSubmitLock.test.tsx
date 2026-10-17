import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSubmitLock } from "./useSubmitLock";

describe("useSubmitLock", () => {
  it("runs a single call and clears busy", async () => {
    const { result } = renderHook(() => useSubmitLock());
    let resolved: number | undefined;
    await act(async () => {
      resolved = await result.current.run(async () => 42);
    });
    expect(resolved).toBe(42);
    expect(result.current.busy).toBe(false);
  });

  it("blocks a second call while the first is in flight", async () => {
    const { result } = renderHook(() => useSubmitLock());
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return "done";
    });

    let first: unknown;
    let second: unknown;
    await act(async () => {
      first = result.current.run(fn);
      second = result.current.run(fn);
      await Promise.all([first, second]);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("releases the lock after an error", async () => {
    const { result } = renderHook(() => useSubmitLock());
    await act(async () => {
      await expect(result.current.run(async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    });
    expect(result.current.busy).toBe(false);
    // second run should still be allowed
    let ok = false;
    await act(async () => {
      await result.current.run(async () => {
        ok = true;
      });
    });
    expect(ok).toBe(true);
  });
});
