"use client";

import * as React from "react";
import { useLive } from "@/lib/stores/live";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Runs an async accessor and tracks loading / error / data, with a `reload()`
 * for retry. Drives the dashboard's real loading + error states. Pass the
 * dependency list that should re-trigger the fetch (filters, id, scope…).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);
  // Any data mutation bumps the live revision → every useAsync re-fetches, so
  // lists / detail / dashboard / charts stay in sync with the store.
  const revision = useLive((s) => s.revision);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : "Something went wrong.");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, revision]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/**
 * True when the URL carries `?debug=error` — pages forward this to the mock
 * accessors to force an error state for review. Read client-side at fetch time,
 * so it needs no Suspense boundary.
 */
export function debugErrorFlag(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "error";
}
