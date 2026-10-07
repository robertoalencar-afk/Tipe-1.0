// Atribuição (UTM, indicação, simulador, calculadora) guardada só no navegador
// até o cadastro, e scripts de medição carregados apenas após consentimento.
import { hasConsent } from "./consent";

// [PREENCHER] IDs de medição. Vazios = nenhum script é carregado.
export const META_PIXEL_ID = "";
export const GA4_ID = "";

const KEY = "tipe:attribution";
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type Attribution = Partial<Record<(typeof UTM)[number] | "ref", string>> & {
  usedSimulator?: boolean;
  calculator?: Record<string, number>;
};

function read(): Attribution {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Attribution; } catch { return {}; }
}
function write(a: Attribution) {
  try { window.localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* armazenamento indisponível */ }
}

/** Chamado ao chegar no site: guarda UTM e ?ref= para não perder na navegação. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  const a = read();
  let changed = false;
  for (const k of UTM) { const v = q.get(k); if (v) { a[k] = v.slice(0, 120); changed = true; } }
  const ref = q.get("ref");
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) { a.ref = ref.toLowerCase(); changed = true; }
  if (changed) write(a);
}
export const markSimulatorUsed = () => { const a = read(); if (!a.usedSimulator) write({ ...a, usedSimulator: true }); };
export const saveCalculator = (c: Record<string, number>) => write({ ...read(), calculator: c });
export const getAttribution = read;

declare global { interface Window { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] } }

let loaded = { pixel: false, ga: false };
/** Carrega Pixel/GA4 somente com consentimento e ID configurado. */
export function loadMeasurement() {
  if (typeof window === "undefined") return;
  if (GA4_ID && !loaded.ga && hasConsent("analytics")) {
    loaded.ga = true;
    const s = document.createElement("script"); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`; document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); };
    window.gtag("js", new Date()); window.gtag("config", GA4_ID);
  }
  if (META_PIXEL_ID && !loaded.pixel && hasConsent("marketing")) {
    loaded.pixel = true;
    const q: unknown[] = [];
    const fbq = (...a: unknown[]) => { q.push(a); };
    (fbq as unknown as { queue: unknown[] }).queue = q;
    window.fbq = fbq;
    const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(s);
    window.fbq("init", META_PIXEL_ID); window.fbq("track", "PageView");
  }
}

/** Evento de conversão "Lead" ao concluir a Etapa 1. */
export function trackLead() {
  if (typeof window === "undefined") return;
  if (hasConsent("marketing")) window.fbq?.("track", "Lead");
  if (hasConsent("analytics")) window.gtag?.("event", "generate_lead");
}
