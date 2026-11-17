import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ChevronsDown, ChevronsUp, X } from "lucide-react";
import { openLebre, useMascotPreference } from "@/lib/tipe/mascot-preference";
import { getMenuAssistant } from "@/lib/tipe/menu-intelligence.functions";
import poseEsperando from "@/assets/mascot-waiting.webp";
import poseFeliz from "@/assets/mascot-thanks.webp";
import poseEstrela from "@/assets/mascot-rating.webp";
import poseAviso from "@/assets/mascot-table-closed.webp";
import { classeBotaoLebre, ConteudoBotaoLebre } from "./LebreBotao";

export type Fala = { t: string; d: string; pergunta?: string };

/** Falas que giram no balão: cada uma ensina uma habilidade e abre a Lebre com a frase pronta. */
export const FALAS: Fala[] = [
  {
    t: "Quer o resumo do salão?",
    d: "Mesas abertas, contas e o que pede atenção.",
    pergunta: "Resuma a situação do salão agora",
  },
  { t: "Eu abro mesa num pulo.", d: "É só dizer o número.", pergunta: "Abrir a mesa 5" },
  {
    t: "Lanço pedido por você.",
    d: "Fale do seu jeito, eu acho no cardápio.",
    pergunta: "Lança 2 chopp e 1 picanha na mesa 4",
  },
  { t: "Acabou algum prato?", d: "Eu pauso no cardápio na hora.", pergunta: "Acabou o chopp" },
  {
    t: "Mudou o preço?",
    d: "Eu troco e você confirma.",
    pergunta: "Muda o preço da picanha para 89,90",
  },
  {
    t: "Me ensine o jeito da casa.",
    d: "Eu lembro nas próximas conversas.",
    pergunta: "Lembre que a mesa 10 é da varanda",
  },
  {
    t: "Vai conectar um sistema?",
    d: "Eu passo o passo a passo da chave.",
    pergunta: "Como integro o iFood?",
  },
  { t: "Mande uma foto ou PDF.", d: "Eu leio cardápio, nota e comprovante." },
];

export function saudacao(hora: number): string {
  if (hora < 5) return "Plantão da madrugada? Estou acordada.";
  if (hora < 12) return "Bom dia! Orelhas em pé para o serviço.";
  if (hora < 18) return "Boa tarde! Salão sob controle?";
  return "Boa noite! Hora do movimento.";
}

const GIRO_MS = 12_000;

export function LebreMascote({
  slug,
  onOpen,
  onSuggestions,
  notice,
  onNotices,
  falas: FALAS_USADAS = FALAS,
  onPergunta = openLebre,
}: {
  slug: string;
  onOpen: () => void;
  /** Falas do balão. Padrão: habilidades do painel do restaurante. */
  falas?: Fala[] | undefined;
  /** O que fazer ao tocar numa fala com frase pronta. Padrão: abrir a Lebre do painel com ela escrita. */
  onPergunta?: ((pergunta: string) => void) | undefined;
  onSuggestions?: (() => void) | undefined;
  notice?: { key: string; count: number } | undefined;
  onNotices?: (() => void) | undefined;
}) {
  const [visible, setVisible] = useMascotPreference(slug);
  const query = useQuery({
    queryKey: ["menu-assistant", slug],
    queryFn: () => getMenuAssistant({ data: { slug } }),
    enabled: !!onSuggestions,
    refetchInterval: 60000,
    staleTime: 15000,
    retry: false,
  });
  const count = query.data?.suggestions.length ?? 0;
  const noticeCount = notice?.count ?? 0;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [giro, setGiro] = useState(-1);
  const [pulo, setPulo] = useState(0);
  const [feliz, setFeliz] = useState(false);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    const id = window.setInterval(() => {
      setGiro((g) => (g + 1) % FALAS_USADAS.length);
      setPulo((p) => p + 1);
    }, GIRO_MS);
    return () => window.clearInterval(id);
  }, [pausado, FALAS_USADAS.length]);

  const urgente = noticeCount > 0 || count > 0;
  const messageKey = noticeCount ? notice!.key : count ? `tips:${count}` : "falas";
  const fala: Fala =
    giro < 0
      ? { t: saudacao(new Date().getHours()), d: "Toque em mim para conversar." }
      : FALAS_USADAS[giro]!;
  const pose = feliz
    ? poseFeliz
    : noticeCount > 0
      ? poseAviso
      : count > 0
        ? poseEstrela
        : poseEsperando;

  if (!visible)
    return (
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => setVisible(true)}
          title="Mostrar a Lebre de corpo inteiro"
          aria-label="Mostrar a Lebre de corpo inteiro"
          className="fixed bottom-[4.75rem] right-3 z-40 flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-medium shadow-md hover:border-primary sm:right-5 lg:bottom-[5.75rem]"
        >
          <ChevronsUp className="size-3.5" aria-hidden />
          Mostrar a Lebre
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={classeBotaoLebre(slug)}
          aria-label="Conversar com a Lebre"
        >
          <ConteudoBotaoLebre />
          {urgente && (
            <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-background">
              {noticeCount || count}
            </span>
          )}
        </button>
      </div>
    );

  return (
    <aside
      aria-label="Mascote da Lebre"
      className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-2 z-40 flex max-w-[calc(100vw-1.5rem)] items-end gap-1 print:hidden sm:right-5 lg:bottom-5"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {dismissed !== messageKey && (
        <div
          key={urgente ? messageKey : `${giro}`}
          className="lebre-balao pointer-events-auto relative mb-14 w-48 rounded-2xl border border-border bg-background p-3 pr-7 text-sm shadow-lg sm:w-60"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className="absolute -right-2 bottom-6 size-3 rotate-45 border-r border-t border-border bg-background"
          />
          <button
            type="button"
            onClick={() => setDismissed(messageKey)}
            aria-label="Fechar dica"
            className="absolute right-1 top-1 grid size-7 place-items-center rounded-full hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
          {urgente ? (
            <button
              type="button"
              onClick={noticeCount > 0 ? onNotices : onSuggestions}
              className="text-left"
            >
              <span className="block font-semibold">
                {noticeCount > 0
                  ? `Você tem ${noticeCount} ${noticeCount === 1 ? "aviso que precisa" : "avisos que precisam"} de atenção`
                  : `Tenho ${count === 1 ? "uma ideia" : `${count} ideias`} para seu cardápio`}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground underline underline-offset-4">
                {noticeCount > 0 ? "Ver avisos da gestão" : "Ver sugestões da Lebre"}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => (fala.pergunta ? onPergunta(fala.pergunta) : onOpen())}
                className="text-left"
              >
                <span className="block font-semibold">{fala.t}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{fala.d}</span>
                {fala.pergunta && (
                  <span className="mt-2 block w-fit rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-strong">
                    “{fala.pergunta}”
                  </span>
                )}
              </button>
              <div className="mt-2 flex items-center gap-1" aria-hidden>
                {FALAS_USADAS.map((f, i) => (
                  <span
                    key={f.t}
                    className={`h-1 rounded-full transition-all ${i === giro ? "w-3 bg-primary" : "w-1 bg-border"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="pointer-events-auto relative shrink-0">
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Recolher a Lebre"
          title="Recolher a Lebre"
          className="absolute -left-1 bottom-1 z-10 grid size-7 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground"
        >
          <ChevronsDown className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setFeliz(true);
            window.setTimeout(() => setFeliz(false), 1600);
            onOpen();
          }}
          onMouseEnter={() => setFeliz(true)}
          onMouseLeave={() => setFeliz(false)}
          aria-label="Conversar com a Lebre"
          className="block rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span key={pulo} className="lebre-pulo block">
            <img
              src={pose}
              alt="Lebre de corpo inteiro"
              className="lebre-companheira h-40 w-24 object-cover transition-opacity sm:h-48 sm:w-28"
            />
          </span>
        </button>
      </div>
    </aside>
  );
}
