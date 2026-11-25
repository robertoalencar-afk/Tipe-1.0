/**
 * Celular realista com as telas reais do app do cliente (src/assets/telas-reais, capturadas do
 * código do app com dados de teste do restaurante fictício Maré Alta). As telas trocam por
 * opacidade; um toque turquesa aparece no botão antes de cada troca.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconesStatus } from "@/components/tipe/BarraStatusIOS";
import "./celular-real.css";

const ARQUIVOS = import.meta.glob("/src/assets/telas-reais/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type TelaReal =
  | "conta"
  | "dividir"
  | "metodos"
  | "pix"
  | "pago"
  | "gorjeta"
  | "gorjeta-metodo"
  | "gorjeta-pix"
  | "avaliacao"
  | "cardapio"
  | "pedido"
  | "guest-descobrir"
  | "guest-horarios"
  | "guest-hold"
  | "guest-confirmada"
  | "guest-pagar"
  | "guest-gorjeta"
  | "guest-fim"
  | "guest-espera"
  | "app-descobrir"
  | "app-horarios"
  | "app-dados"
  | "app-garantia"
  | "app-confirmada"
  | "order-inicio"
  | "order-cozinha"
  | "order-conta"
  | "order-fim"
  | "order-story-baiao"
  | "order-story-peixe"
  | "order-story-bebidas"
  | "order-story-3d";

export function telaReal(nome: TelaReal) {
  const u = (w: number) => ARQUIVOS[`/src/assets/telas-reais/${nome}-${w}.webp`] ?? "";
  return { src: u(390), srcSet: `${u(390)} 390w, ${u(780)} 780w` };
}

/** Uma etapa do fluxo: a tela e, se houver, onde o dedo toca (em % da área do app). */
export type EtapaCelular = { tela: TelaReal; alt: string; toque?: { x: number; y: number } };

/** Índice que avança sozinho a cada `ms`, só enquanto `ativo` (na tela e sem movimento reduzido). */
export function useSequencia(total: number, ms: number, ativo: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!ativo || total < 2) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % total), ms);
    return () => window.clearInterval(id);
  }, [ativo, total, ms]);
  return [i, setI] as const;
}

/** Mostra o toque perto do fim de cada etapa, antes da troca. */
function useToque(indice: number, ms: number, ativo: boolean) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    if (!ativo) return;
    const id = window.setTimeout(() => setOn(true), Math.max(0, ms - 850));
    return () => window.clearTimeout(id);
  }, [indice, ms, ativo]);
  return on;
}

export function CelularReal({
  etapas,
  indice,
  ms = 3000,
  animando = true,
  sizes = "(min-width: 1024px) 18rem, 45vw",
  className,
  prioridade = false,
}: {
  etapas: EtapaCelular[];
  indice: number;
  ms?: number;
  animando?: boolean;
  sizes?: string;
  className?: string;
  prioridade?: boolean;
}) {
  const toque = useToque(indice, ms, animando);
  const atual = etapas[indice];
  // Carrega a tela atual e a próxima; as já vistas ficam carregadas.
  const [alcance, setAlcance] = useState(1);
  useEffect(() => setAlcance((a) => Math.max(a, indice + 1)), [indice]);
  return (
    <div className={cn("cel-real", className)}>
      <i className="cel-btn acao" aria-hidden />
      <i className="cel-btn v1" aria-hidden />
      <i className="cel-btn v2" aria-hidden />
      <i className="cel-btn lig" aria-hidden />
      <div className="cel-bezel">
        <div className="cel-vidro">
          <span className="cel-ilha" aria-hidden />
          <div className="cel-status" aria-hidden>
            <span>21:16</span>
            <span className="cel-icones">
              <IconesStatus />
            </span>
          </div>
          <div className="cel-app">
            {etapas.map((e, i) => {
              const { src, srcSet } = telaReal(e.tela);
              const carregar = i <= alcance;
              return (
                <img
                  key={e.tela + i}
                  src={carregar ? src : undefined}
                  srcSet={carregar ? srcSet : undefined}
                  sizes={sizes}
                  width={390}
                  height={844}
                  alt={i === indice ? e.alt : ""}
                  aria-hidden={i !== indice || undefined}
                  loading={i === 0 && prioridade ? "eager" : "lazy"}
                  decoding="async"
                  data-on={i === indice || undefined}
                  className="cel-tela"
                />
              );
            })}
            {atual?.toque && (
              <span
                key={indice}
                className="cel-toque"
                data-on={toque || undefined}
                style={{ left: `${atual.toque.x}%`, top: `${atual.toque.y}%` }}
                aria-hidden
              />
            )}
          </div>
          <span className="cel-home" aria-hidden />
        </div>
      </div>
    </div>
  );
}
