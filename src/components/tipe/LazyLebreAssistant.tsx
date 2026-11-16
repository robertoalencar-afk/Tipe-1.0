import { lazy, Suspense, useEffect, useState } from "react";
import { classeBotaoLebre, ConteudoBotaoLebre } from "@/components/tipe/LebreBotao";

import { OPEN_LEBRE } from "@/lib/tipe/mascot-preference";
const LebreMascote = lazy(() =>
  import("./LebreMascote").then((m) => ({ default: m.LebreMascote })),
);

const carregar = () => import("@/components/tipe/LebreAssistant");
const LebreAssistant = lazy(() => carregar().then((m) => ({ default: m.LebreAssistant })));

/**
 * Botão da Lebre que aparece na hora e só baixa o chat (≈1 MB de JS com o renderizador
 * de Markdown) quando a pessoa mostra intenção: passar o mouse, focar ou tocar. Assim o
 * chat não disputa banda com fotos e vídeos da landing nem com o painel do restaurante.
 */
export function LazyLebreAssistant({
  slug,
  onSuggestions,
  notice,
  onNotices,
}: {
  slug?: string | undefined;
  onSuggestions?: (() => void) | undefined;
  notice?: { key: string; count: number } | undefined;
  onNotices?: (() => void) | undefined;
}) {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    const open = () => setAberta(true);
    window.addEventListener(OPEN_LEBRE, open);
    return () => window.removeEventListener(OPEN_LEBRE, open);
  }, []);
  if (slug)
    return (
      <>
        <Suspense fallback={null}>
          <LebreMascote
            slug={slug}
            notice={notice}
            onNotices={onNotices}
            onSuggestions={onSuggestions}
            onOpen={() => window.dispatchEvent(new Event(OPEN_LEBRE))}
          />
        </Suspense>
        {aberta && (
          <Suspense
            fallback={
              <p
                role="status"
                className="fixed bottom-5 right-5 z-50 rounded-xl bg-background p-4 shadow-sm"
              >
                Abrindo a Lebre…
              </p>
            }
          >
            <LebreAssistant slug={slug} inicialAberta hideLauncher />
          </Suspense>
        )}
      </>
    );
  if (aberta) {
    return (
      <Suspense
        fallback={
          <button
            type="button"
            className={classeBotaoLebre(slug)}
            aria-label="Abrindo a Lebre"
            aria-busy
          >
            <ConteudoBotaoLebre />
          </button>
        }
      >
        <LebreAssistant slug={slug} inicialAberta />
      </Suspense>
    );
  }
  const preparar = () => void carregar();
  return (
    <button
      type="button"
      className={classeBotaoLebre(slug)}
      aria-label="Pergunte à Lebre"
      onPointerEnter={preparar}
      onFocus={preparar}
      onTouchStart={preparar}
      onClick={() => setAberta(true)}
    >
      <ConteudoBotaoLebre />
    </button>
  );
}
