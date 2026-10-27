import { useSyncExternalStore } from "react";
import { dispatch, type Command, type Result } from "./engine";
import { createSeed, SEED_VERSION } from "./seed";
import type { CrmState } from "./types";

// Persistência do modo demonstração: o estado inteiro vive no localStorage deste navegador
// e é sincronizado entre abas. Toda escrita passa pelo motor (dispatch), nunca direto aqui.
// Em produção esta camada é trocada por chamadas ao Supabase (ver migração crm e README).

const KEY = "tipe-crm-demo-v1";
const CHANNEL = "tipe-crm-demo";

let state: CrmState | null = null;
let lastWrite = 0;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function read(): CrmState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CrmState;
      if (parsed.version === SEED_VERSION) return parsed;
    }
  } catch {
    // Armazenamento indisponível ou corrompido: recomeça com a demonstração.
  }
  const fresh = createSeed();
  persist(fresh);
  return fresh;
}

function persist(s: CrmState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
    lastWrite = Date.now();
  } catch {
    // Sem armazenamento (aba anônima bloqueada): segue só na memória desta aba.
  }
}

function emit() {
  for (const l of listeners) l();
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    state = read();
    emit();
  };
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { state = read(); emit(); }
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  ensureChannel();
  return () => listeners.delete(fn);
}

function getSnapshot() {
  if (!state && typeof window !== "undefined") state = read();
  return state;
}

export function useCrmState(): CrmState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function runCommand(cmd: Command): Result {
  const current = getSnapshot();
  if (!current) throw new Error("O CRM ainda está carregando.");
  const result = dispatch(current, cmd);
  if (result.state !== current) {
    state = result.state;
    persist(state);
    channel?.postMessage(lastWrite);
    emit();
  }
  return result;
}

export function resetDemo() {
  const fresh = createSeed();
  state = fresh;
  persist(fresh);
  channel?.postMessage(lastWrite);
  emit();
}

export function lastSyncAt() {
  return lastWrite;
}
