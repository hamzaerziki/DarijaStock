import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Page } from "@/lib/api";

type FetchParams = Record<string, string | number | boolean | undefined>;

/**
 * Shared list-page state. Keeps `page`, `q` and filters in the URL so refresh
 * and the back button preserve state, and cancels/ignores stale responses.
 *
 * - Search is manual: only applied when `submitSearch()` is called (button or Enter).
 * - Changing a filter always resets `page` to 1.
 */
export function useListPage<T>(opts: {
  fetcher: (params: FetchParams, signal: AbortSignal) => Promise<Page<T>>;
  pageSize?: number;
  filterKeys?: string[];
  /** Extra toast message hook for load errors (optional). */
  onError?: (e: unknown) => void;
}) {
  const { fetcher, pageSize = 20, filterKeys = [], onError } = opts;
  const [sp, setSp] = useSearchParams();

  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const q = sp.get("q") ?? "";
  const filters: Record<string, string> = Object.fromEntries(
    filterKeys.map((k) => [k, sp.get(k) ?? ""]),
  );

  const [draftQ, setDraftQ] = useState(q);
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const reqId = useRef(0);

  // Keep the search draft in sync when the URL q changes (e.g. back button).
  useEffect(() => setDraftQ(q), [q]);

  const update = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === "") next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  const filterKeyStr = JSON.stringify(filters);

  useEffect(() => {
    const ctrl = new AbortController();
    const id = ++reqId.current;
    setLoading(true);
    fetcher({ page, page_size: pageSize, q: q || undefined, ...filters }, ctrl.signal)
      .then((r) => {
        if (id === reqId.current) {
          setData(r);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted && id === reqId.current) {
          setError(e);
          onError?.(e);
        }
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, filterKeyStr]);

  return {
    data,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    page,
    pageSize,
    q,
    filters,
    draftQ,
    setDraftQ,
    /** True when a search or filter is narrowing the results (for search-aware empty states). */
    filtered: Boolean(q || Object.values(filters).some(Boolean)),
    submitSearch: () => update({ q: draftQ.trim(), page: 1 }),
    clearFilters: () => {
      setDraftQ("");
      const reset: Record<string, string | number | undefined> = { q: "", page: 1 };
      for (const k of filterKeys) reset[k] = "";
      update(reset);
    },
    setFilter: (k: string, v: string) => update({ [k]: v, page: 1 }),
    setPage: (p: number) => update({ page: p }),
    reload: () => update({}),
  };
}
