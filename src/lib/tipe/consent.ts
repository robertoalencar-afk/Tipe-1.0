// Preferências de privacidade guardadas apenas no navegador (sem identificador pessoal).
// Hoje o TIPE só usa tecnologias estritamente necessárias; analytics/marketing
// NÃO existem. Qualquer script futuro deve checar hasConsent(categoria) antes de carregar.
import { LEGAL } from "./legal";

export type ConsentCategory = "functional" | "analytics" | "marketing";
export type ConsentState = Record<ConsentCategory, boolean> & { consent_version: string; policy_version: string; timestamp: string };

const KEY = "tipe:privacy-consent";
export const CONSENT_VERSION = "2";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as ConsentState | null;
    return v && v.consent_version === CONSENT_VERSION ? v : null;
  } catch { return null; }
}

export function saveConsent(c: Record<ConsentCategory, boolean>) {
  const state: ConsentState = { ...c, consent_version: CONSENT_VERSION, policy_version: LEGAL.cookie_policy.version, timestamp: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("tipe:consent", { detail: state }));
  return state;
}

/** Bloqueio prévio: sem decisão explícita, nenhuma categoria opcional é permitida. */
export function hasConsent(cat: ConsentCategory): boolean {
  return readConsent()?.[cat] === true;
}
