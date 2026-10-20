// Estado da demonstração no navegador. Fica no localStorage e é compartilhado
// entre abas: cliente numa aba, cozinha em outra, garçom no celular ao lado
// (mesmo navegador). Cada ação é aplicada sob um Web Lock, relendo o estado
// mais recente, para que duas abas não sobrescrevam uma à outra.

import { useCallback, useSyncExternalStore } from "react";
import { apply, seedState, type Action, type ApplyResult, type DemoState } from "./engine";

const KEY = "tipe-demo-v3";
const CHANNEL = "tipe-demo-v3";

let cache: DemoState | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function read(): DemoState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === 3) return parsed;
    }
  } catch {
    /* armazenamento indisponível: segue com estado novo */
  }
  const fresh = seedState(Date.now());
  write(fresh);
  return fresh;
}

function write(s: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* modo privado: a demonstração funciona só nesta aba */
  }
}

function emit() {
  for (const l of listeners) l();
}

function ensureWired() {
  if (channel || typeof window === "undefined") return;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => {
      cache = read();
      emit();
    };
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = read();
      emit();
    }
  });
}

function subscribe(cb: () => void) {
  ensureWired();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function snapshot() {
  if (!cache) cache = read();
  return cache;
}

async function withLock<T>(fn: () => T): Promise<T> {
  const locks =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { locks?: LockManager }).locks
      : undefined;
  if (locks) return locks.request(KEY, async () => fn());
  return fn();
}

/** Aplica uma ação sobre o estado mais recente (de qualquer aba). */
export async function dispatch(action: Action): Promise<ApplyResult> {
  return withLock(() => {
    const current = read();
    const result = apply(current, action);
    if (result.ok && result.state !== current) {
      write(result.state);
      cache = result.state;
      channel?.postMessage("changed");
      emit();
    }
    return result;
  });
}

export async function resetDemo() {
  await withLock(() => {
    const fresh = seedState(Date.now());
    write(fresh);
    cache = fresh;
    channel?.postMessage("changed");
    emit();
  });
}

export function useDemo() {
  const state = useSyncExternalStore(subscribe, snapshot, () => null);
  const run = useCallback((a: Action) => dispatch(a), []);
  return { state, run };
}
