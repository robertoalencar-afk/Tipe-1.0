import { lazy, Suspense, useState } from "react";
import { classeBotaoLebre, ConteudoBotaoLebre } from "@/components/tipe/LebreBotao";

const carregar = () => import("@/components/tipe/LebreAssistant");
const LebreAssistant = lazy(() => carregar().then((m) => ({ default: m.LebreAssistant })));

/**
 * Botão da Lebre que aparece na hora e só baixa o chat (≈1 MB de JS com o renderizador
 * de Markdown) quando a pessoa mostra intenção: passar o mouse, focar ou tocar. Assim o
 * chat não disputa banda com fotos e vídeos da landing nem com o painel do restaurante.
 */
export function LazyLebreAssistant({ slug }: { slug?: string | undefined }) {
  const [aberta, setAberta] = useState(false);
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
