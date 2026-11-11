/**
 * Estado de lançamento no navegador: menu, cards e página leem daqui. No servidor (SSR) e
 * na hidratação vale o padrão do catálogo, para o HTML bater; depois o navegador pergunta
 * uma vez por carregamento à server function getLaunchState. A página do produto semeia o
 * valor que o loader já trouxe, sem segunda chamada.
 */
import { useEffect, useSyncExternalStore } from "react";
import { getLaunchState } from "@/lib/tipe/launch-state.functions";
import {
  LANCAMENTO_PADRAO,
  TEXTOS_LANCAMENTO,
  type EstadoLancamento,
} from "@/lib/tipe/launch-state";
import type { Produto } from "./produtos";

let estados: Record<string, EstadoLancamento> = { ...LANCAMENTO_PADRAO };
const pedidos = new Set<string>();
const ouvintes = new Set<() => void>();

function emitir() {
  for (const o of ouvintes) o();
}

/** Guarda o estado que o loader da página já buscou (evita a segunda chamada). */
export function semearLancamento(slug: string, estado: EstadoLancamento) {
  pedidos.add(slug);
  if (estados[slug] === estado) return;
  estados = { ...estados, [slug]: estado };
  emitir();
}

function buscar(slug: string) {
  if (pedidos.has(slug)) return;
  pedidos.add(slug);
  getLaunchState({ data: { slug } })
    .then((r) => semearLancamento(slug, r.estado))
    .catch(() => {
      /* sem rede ou servidor fora: fica o padrão do catálogo */
    });
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};
const doCliente = () => estados;
const doServidor = () => LANCAMENTO_PADRAO;

/** Mapa slug → estado de todos os produtos com lançamento configurável. */
export function useEstadosLancamento() {
  const mapa = useSyncExternalStore(assinar, doCliente, doServidor);
  useEffect(() => {
    for (const slug of Object.keys(LANCAMENTO_PADRAO)) buscar(slug);
  }, []);
  return mapa;
}

/**
 * Selo do produto no menu, nos cards e no rodapé. Produto com lançamento configurável usa
 * o estado; os outros continuam no "Em breve" do catálogo.
 */
export function seloDoProduto(p: Produto, mapa: Record<string, EstadoLancamento>): string | null {
  const estado = mapa[p.slug];
  if (estado) return TEXTOS_LANCAMENTO[estado].selo;
  return p.status === "em-breve" ? "Em breve" : null;
}
