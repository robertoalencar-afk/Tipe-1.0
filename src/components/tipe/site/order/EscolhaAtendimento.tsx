/**
 * "Escolha seu atendimento": seletor interativo das 7 modalidades do Tipe Order. O estado da
 * modalidade é da página (compartilhado com o simulador), para "Ver funcionando" abrir o
 * simulador já na modalidade escolhida. Tudo sem recarregar; animação curta de troca,
 * desligada quando o sistema pede menos movimento.
 *
 * "Sua casa é…" destaca os formatos que combinam com o tipo de casa; cada aba mostra o selo de
 * disponibilidade. Disponibilidade vem de DEFINICOES (auditada no código), nunca do que o simulador faz.
 */
import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Bike,
  ClipboardList,
  Nfc,
  MonitorSmartphone,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { TotemDemonstracao, PulseiraDemonstracao } from "./VisuaisOrder";
import { cn } from "@/lib/utils";
import {
  DEFINICOES,
  ORDEM_SELETOR,
  estaContratavel,
  TEXTO_DISPONIBILIDADE,
  type Disponibilidade,
  type Modalidade,
} from "@/lib/tipe/order/modalidades";
import { trackProduto } from "@/lib/tipe/tracking";
import { Foto, type NomeFoto } from "../Foto";
import { Secao, Titulo } from "../Site";
import { CelularReal, type TelaReal } from "../produto/TelaReal";
import { useMovimentoReduzido } from "../produto/useVisivel";

export const ICONE_MODALIDADE: Record<Modalidade, LucideIcon> = {
  mesas: UtensilsCrossed,
  balcao: Store,
  comanda: ClipboardList,
  retirada: ShoppingBag,
  delivery: Bike,
  totem: MonitorSmartphone,
  pulseira: Nfc,
};

/** Foto da cena (casting fictício) e tela real que flutua sobre ela. Totem e pulseira têm vitrine própria. */
const VISUAL: Record<
  Modalidade,
  { foto?: NomeFoto; posicao?: string; tela?: TelaReal; alt: string }
> = {
  mesas: { foto: "cena-casal", tela: "order-inicio", alt: "Casal à mesa pedindo pelo celular" },
  balcao: {
    foto: "cena-caixa",
    posicao: "50% 35%",
    tela: "order-cozinha",
    alt: "Atendente no caixa lançando um pedido",
  },
  comanda: { foto: "cena-bartender", tela: "order-conta", alt: "Bartender atendendo no balcão" },
  retirada: { foto: "cena-executiva", tela: "order-cozinha", alt: "Cliente retirando o pedido" },
  delivery: { foto: "cena-cozinha", tela: "order-cozinha", alt: "Cozinha preparando pedidos" },
  totem: { alt: "Totem de autoatendimento" },
  pulseira: { alt: "Pulseira NFC Tipe" },
};

const COR_STATUS: Record<Disponibilidade, string> = {
  operacional: "bg-[#0FC9BD]",
  piloto: "bg-[#03665f]",
  desenvolvimento: "bg-amber-500",
  demonstracao: "bg-amber-500",
  planejada: "bg-slate-300",
};

export function SeloDisponibilidade({ d, className }: { d: Disponibilidade; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", COR_STATUS[d])} aria-hidden />
      {TEXTO_DISPONIBILIDADE[d].selo}
    </span>
  );
}

/* ------------------------------------------------------------------ seletor */

/** Rótulo curto da aba (o nome completo aparece no painel). */
const ROTULO_ABA: Record<Modalidade, string> = {
  mesas: "Mesas",
  balcao: "Balcão",
  comanda: "Comanda",
  retirada: "Retirada",
  delivery: "Delivery",
  totem: "Totem",
  pulseira: "Pulseira",
};

/** Atalho "Sua casa é…": pré-seleciona o formato mais indicado e destaca os que combinam. */
const PERFIS: { id: string; nome: string; modalidades: Modalidade[] }[] = [
  { id: "restaurante", nome: "Restaurante", modalidades: ["mesas", "retirada", "delivery"] },
  { id: "bar", nome: "Bar", modalidades: ["mesas", "comanda", "pulseira"] },
  { id: "cafeteria", nome: "Cafeteria ou padaria", modalidades: ["balcao", "retirada", "totem"] },
  { id: "rapido", nome: "Lanchonete ou fast-food", modalidades: ["totem", "balcao", "retirada"] },
  { id: "evento", nome: "Evento ou beach club", modalidades: ["pulseira", "comanda", "mesas"] },
];

const ETAPAS_VISIVEIS = 4;

export function EscolhaAtendimento({
  modalidade,
  onModalidade,
}: {
  modalidade: Modalidade;
  onModalidade: (m: Modalidade) => void;
}) {
  const reduzido = useMovimentoReduzido();
  const base = useId();
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [jornadaAberta, setJornadaAberta] = useState(false);
  const def = DEFINICOES[modalidade];
  const vis = VISUAL[modalidade];
  const Icone = ICONE_MODALIDADE[modalidade];
  const combinam = PERFIS.find((p) => p.id === perfil)?.modalidades ?? [];
  const contratavel = estaContratavel(modalidade);
  const fluxo = def.fluxo;
  const escondidas = fluxo.length - ETAPAS_VISIVEIS;

  const escolher = (m: Modalidade, origem = "modalidade") => {
    setJornadaAberta(false);
    if (m === modalidade) return;
    onModalidade(m);
    trackProduto("produto_cta", { produto: "order", local: `${origem}_${m}` });
  };
  const escolherPerfil = (id: string) => {
    const novo = perfil === id ? null : id;
    setPerfil(novo);
    const p = PERFIS.find((x) => x.id === novo);
    if (p) escolher(p.modalidades[0]!, `perfil_${p.id}`);
  };
  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ORDEM_SELETOR.indexOf(modalidade);
    const n = ORDEM_SELETOR.length;
    let alvo = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") alvo = (i + 1) % n;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") alvo = (i - 1 + n) % n;
    if (e.key === "Home") alvo = 0;
    if (e.key === "End") alvo = n - 1;
    if (alvo < 0) return;
    e.preventDefault();
    escolher(ORDEM_SELETOR[alvo]!);
    abas.current[alvo]?.focus();
    abas.current[alvo]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <Secao tema="claro" id="atendimento">
      <div className="container-page">
        <Titulo
          rotulo="Escolha seu atendimento"
          titulo="Mesa, balcão, totem, pulseira. Um cadastro só."
          texto="O mesmo cardápio, a mesma cozinha e a mesma conta, no formato em que a sua casa atende. Escolha um formato para acompanhar o caminho do pedido."
        />

        {/* Atalho por tipo de casa */}
        <div className="mt-8 lg:mt-12">
          <p id={`${base}-perfil`} className="text-sm font-medium text-muted-foreground">
            Sua casa é…
          </p>
          <div
            role="group"
            aria-labelledby={`${base}-perfil`}
            className="-mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {PERFIS.map((p) => {
              const ativo = p.id === perfil;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => escolherPerfil(p.id)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03665f]",
                    ativo
                      ? "border-[#03665f] bg-[#e6faf8] text-[#03665f]"
                      : "border-dashed border-border text-foreground hover:border-[#03665f]/50",
                  )}
                >
                  {p.nome}
                </button>
              );
            })}
          </div>
        </div>

        {/* Abas: rolagem lateral no celular, uma linha no desktop */}
        <div
          role="tablist"
          aria-label="Modalidades de atendimento"
          onKeyDown={teclas}
          className="-mx-6 mt-5 flex snap-x scroll-px-6 gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {ORDEM_SELETOR.map((m, i) => {
            const d = DEFINICOES[m];
            const I = ICONE_MODALIDADE[m];
            const ativa = m === modalidade;
            const combina = combinam.includes(m);
            return (
              <button
                key={m}
                ref={(el) => {
                  abas.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${base}-aba-${m}`}
                aria-selected={ativa}
                aria-controls={`${base}-painel`}
                tabIndex={ativa ? 0 : -1}
                onClick={() => escolher(m)}
                className={cn(
                  "relative flex min-h-12 shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2 text-[0.95rem] font-medium transition-[background-color,color,border-color,opacity] duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#03665f]",
                  ativa
                    ? "border-[#021E34] bg-[#021E34] text-white"
                    : "border-border bg-background text-foreground hover:border-foreground/40",
                  perfil && !combina && !ativa && "opacity-45",
                  combina && !ativa && "border-[#0FC9BD]",
                )}
              >
                <I
                  className={cn("h-4.5 w-4.5", ativa ? "text-[#0FC9BD]" : "text-[#03665f]")}
                  aria-hidden
                />
                {ROTULO_ABA[m]}
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", COR_STATUS[d.disponibilidade])}
                  aria-hidden
                />
                <span className="sr-only">({TEXTO_DISPONIBILIDADE[d.disponibilidade].selo})</span>
              </button>
            );
          })}
        </div>
        <p
          className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          aria-hidden
        >
          {(["operacional", "piloto", "desenvolvimento", "planejada"] as const).map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", COR_STATUS[d])} />
              {TEXTO_DISPONIBILIDADE[d].selo}
            </span>
          ))}
        </p>

        <div
          key={modalidade}
          id={`${base}-painel`}
          tabIndex={0}
          role="tabpanel"
          aria-labelledby={`${base}-aba-${modalidade}`}
          className={cn(
            "mt-6 grid gap-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#03665f] lg:mt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14",
            !reduzido && "sobe-suave",
          )}
        >
          {/* Visual */}
          <div className="relative min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#021E34] sm:aspect-[5/4] lg:sticky lg:top-28 lg:aspect-[4/5]">
              {modalidade === "totem" ? (
                <TotemDemonstracao />
              ) : modalidade === "pulseira" ? (
                <PulseiraDemonstracao />
              ) : (
                vis.foto && (
                  <Foto
                    nome={vis.foto}
                    alt={vis.alt}
                    posicao={vis.posicao}
                    className="h-full w-full"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                )
              )}
              {vis.tela && (
                <CelularReal
                  tela={vis.tela}
                  alt={`Tela real do Tipe Order: ${def.nome}`}
                  sizes="180px"
                  className="pop-in absolute bottom-4 right-4 w-[min(38%,11rem)] sm:bottom-6 sm:right-6"
                />
              )}
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#021E34] backdrop-blur sm:left-6 sm:top-6">
                {modalidade === "totem" || modalidade === "pulseira"
                  ? "Composição · dados de exemplo"
                  : "Tela do Order · dados de exemplo"}
              </span>
            </div>
          </div>

          {/* Texto */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6faf8] text-[#03665f]">
                <Icone className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-display text-[1.7rem] leading-none tracking-[-0.035em] sm:text-[2rem]">
                {def.nome}
              </h3>
              <SeloDisponibilidade d={def.disponibilidade} className="text-[#021E34]" />
            </div>
            <p className="mt-4 text-[1.1rem] leading-relaxed text-muted-foreground sm:text-xl">
              {def.promessa}
            </p>
            {!contratavel && (
              <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm leading-snug text-muted-foreground">
                {TEXTO_DISPONIBILIDADE[def.disponibilidade].curto}
              </p>
            )}

            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Ideal para
              </h4>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {def.indicada.map((x) => (
                  <li
                    key={x}
                    className="rounded-full bg-[#021E34]/[0.05] px-3 py-1 text-sm text-[#021E34]"
                  >
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <ul className="mt-6 space-y-2.5">
              {def.beneficios.slice(0, 3).map((b) => (
                <li key={b.t} className="flex gap-3 text-[0.98rem] leading-snug">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#0FC9BD]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">{b.t}.</span>{" "}
                    <span className="text-muted-foreground">{b.d}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-border pt-5">
              <h4 className="mb-4 text-sm font-semibold">Do pedido à entrega</h4>
              <ol className="relative space-y-3">
                <span
                  className="absolute bottom-3 left-[0.6875rem] top-3 w-px bg-border"
                  aria-hidden
                />
                {fluxo.map((p, i) => (
                  <li
                    key={i}
                    className={cn(
                      "relative flex gap-3 text-[0.92rem] leading-snug",
                      !jornadaAberta && i >= ETAPAS_VISIVEIS && "hidden",
                    )}
                  >
                    <span className="relative mt-px flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full bg-[#021E34] text-[0.65rem] font-semibold text-white tabular-nums ring-4 ring-background">
                      {i + 1}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "mr-1.5 inline-block rounded-md px-1.5 py-px text-[0.7rem] font-semibold uppercase tracking-[0.04em]",
                          COR_QUEM[p.quem],
                        )}
                      >
                        {QUEM[p.quem]}
                      </span>
                      {p.o_que}
                    </span>
                  </li>
                ))}
              </ol>
              {escondidas > 0 && (
                <button
                  type="button"
                  aria-expanded={jornadaAberta}
                  onClick={() => setJornadaAberta((v) => !v)}
                  className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-[#03665f] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03665f]"
                >
                  {jornadaAberta ? "Mostrar menos" : `Ver as ${fluxo.length} etapas`}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", jornadaAberta && "rotate-180")}
                    aria-hidden
                  />
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#simulador"
                onClick={() =>
                  trackProduto("produto_cta", {
                    produto: "order",
                    local: `ver_funcionando_${modalidade}`,
                  })
                }
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#021E34] px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#03465a]"
              >
                Simular {ROTULO_ABA[modalidade].toLowerCase()}{" "}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="#quero-o-order"
                onClick={() =>
                  trackProduto("produto_cta", { produto: "order", local: `cta_${modalidade}` })
                }
                className="inline-flex min-h-12 items-center rounded-full border border-[#021E34]/30 px-6 text-[0.95rem] font-medium text-[#021E34] transition-colors hover:border-[#021E34]"
              >
                {contratavel ? "Conversar sobre este formato" : "Avise-me quando abrir"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}

const QUEM: Record<"cliente" | "equipe" | "cozinha" | "caixa" | "sistema", string> = {
  cliente: "Cliente",
  equipe: "Equipe",
  cozinha: "Cozinha",
  caixa: "Caixa",
  sistema: "Tipe",
};

const COR_QUEM: Record<keyof typeof QUEM, string> = {
  cliente: "bg-[#e6faf8] text-[#03665f]",
  equipe: "bg-[#021E34]/[0.07] text-[#021E34]",
  cozinha: "bg-amber-100 text-amber-800",
  caixa: "bg-sky-100 text-sky-800",
  sistema: "bg-[#0FC9BD]/15 text-[#03665f]",
};
