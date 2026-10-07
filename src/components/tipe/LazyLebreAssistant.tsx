import { lazy, Suspense, useEffect, useState } from "react";

const LebreAssistant = lazy(() => import("@/components/tipe/LebreAssistant").then((m) => ({ default: m.LebreAssistant })));

/** Loads the public Lebre chat only after the page is idle, keeping the first load light. */
export function LazyLebreAssistant() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = () => setReady(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(start, { timeout: 3500 });
    } else {
      const t = window.setTimeout(start, 2500);
      return () => window.clearTimeout(t);
    }
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <LebreAssistant />
    </Suspense>
  );
}
