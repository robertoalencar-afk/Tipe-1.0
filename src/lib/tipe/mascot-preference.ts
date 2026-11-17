import { useEffect, useState } from "react";
const EVENT = "tipe:mascot-preference";
export const OPEN_LEBRE = "tipe:open-lebre";
let perguntaPendente: string | null = null;
/** Abre a Lebre; com uma pergunta, ela já aparece escrita na caixa para a pessoa enviar ou ajustar. */
export function openLebre(pergunta?: unknown) {
  perguntaPendente = typeof pergunta === "string" ? pergunta : null;
  window.dispatchEvent(new Event(OPEN_LEBRE));
}
export function tomarPerguntaPendente(): string | null {
  const p = perguntaPendente;
  perguntaPendente = null;
  return p;
}
/** Personal display preference on this browser; never changes the restaurant's AI settings. */
export function useMascotPreference(scope?: string) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!scope) return;
    const key = `tipe:mascot:${scope}`;
    const read = () => {
      try {
        setVisible(localStorage.getItem(key) !== "hidden");
      } catch {
        /* browser storage unavailable */
      }
    };
    read();
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: string; visible: boolean }>).detail;
      if (detail?.scope === scope) setVisible(detail.visible);
    };
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", read);
    };
  }, [scope]);
  function toggle(value: boolean) {
    setVisible(value);
    if (!scope) return;
    try {
      localStorage.setItem(`tipe:mascot:${scope}`, value ? "visible" : "hidden");
    } catch {
      /* still works for this session */
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { scope, visible: value } }));
  }
  return [visible, toggle] as const;
}
