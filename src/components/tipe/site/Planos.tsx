/**
 * Planos (redesenho 17/11): cartões no sistema visual da landing (marinho #021E34 +
 * turquesa #0FC9BD, tipografia display), preço como protagonista, limite de mesas em selo,
 * "tudo do plano anterior, mais" para não repetir lista. No celular, trilho com rolagem
 * lateral; a partir do md, grade. Comparação em tabela única com cabeçalho fixo.
 * Fonte dos planos: src/lib/tipe/plans.ts (preços só aparecem com SHOW_PLAN_PRICES).
 */
import { Check, Minus, Sparkles } from "lucide-react";
import { PLANS, SHOW_PLAN_PRICES } from "@/lib/tipe/plans";
import { Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { SetaFios } from "./Bigode";

const PARA: Record<string, string> = {
  essencial: "Bares, cafés e casas pequenas que querem a conta paga na mesa.",
  profissional: "Restaurantes com equipe no salão e um PDV para conectar.",
  premium: "Casas grandes, com cozinha, bar e caixa no mesmo painel.",
};

type Cartao = {
  id: string | null;
  nome: string;
  para: string;
  reais: string | null;
  centavos: string;
  mesas: string;
  implantacao: string;
  popular: boolean;
  base: string | null;
  itens: string[];
};

const reais = (v: number) => Math.trunc(v).toLocaleString("pt-BR");
const centavos = (v: number) =>
  `,${Math.round((v % 1) * 100)
    .toString()
    .padStart(2, "0")}`;

const CARTOES: Cartao[] = [
  ...PLANS.map((p) => {
    const itens = [...p.features] as string[];
    const base = itens[0]?.startsWith("Tudo do ") ? itens[0].replace("Tudo do ", "") : null;
    return {
      id: p.id as string,
      nome: p.name,
      para: PARA[p.id] ?? "",
      reais: SHOW_PLAN_PRICES ? reais(p.fullPrice) : null,
      centavos: centavos(p.fullPrice),
      mesas: `Até ${p.maxTables} mesas`,
      implantacao: p.setupPrice
        ? `Implantação única de R$ ${reais(p.setupPrice)}`
        : "Implantação grátis",
      popular: "popular" in p ? Boolean(p.popular) : false,
      base,
      itens: base ? itens.slice(1) : itens,
    };
  }),
  {
    id: null,
    nome: "Personalizado",
    para: "Redes e casas com mais de 40 mesas, com integrações sob medida.",
    reais: null,
    centavos: "",
    mesas: "40+ mesas ou redes",
    implantacao: "Implantação grátis",
    popular: false,
    base: "Premium",
    itens: ["Integrações sob medida", "Implantação acompanhada", "Condições para redes"],
  },
];

function CartaoPlano({ p }: { p: Cartao }) {
  const escuro = p.popular;
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-7",
        escuro
          ? "bg-[#021E34] text-white shadow-[0_30px_60px_-30px_rgb(2_30_52/0.65)]"
          : p.id
            ? "border border-border bg-card"
            : "border border-dashed border-border bg-background-muted/60",
      )}
    >
      {escuro && (
        <>
          {/* Grade fina + brilho turquesa, o mesmo fundo do hub de integrações. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#0FC9BD]/25 blur-3xl"
          />
        </>
      )}
      <div className="relative flex items-center justify-between gap-3">
        <h3 className="font-display text-[1.45rem] font-medium tracking-[-0.03em]">{p.nome}</h3>
        {p.popular && (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#0FC9BD] px-2.5 py-1 text-[0.72rem] font-semibold text-[#021E34]">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            Mais escolhido
          </span>
        )}
      </div>
      <p
        className={cn(
          "relative mt-2 min-h-[3rem] text-[0.95rem] leading-snug text-pretty",
          escuro ? "text-white/70" : "text-muted-foreground",
        )}
      >
        {p.para}
      </p>

      <div className="relative mt-7 flex items-end gap-1">
        {p.reais ? (
          <>
            <span
              className={cn(
                "pb-2 text-base font-medium",
                escuro ? "text-white/70" : "text-muted-foreground",
              )}
            >
              R$
            </span>
            <span className="money font-display text-[3.6rem] font-normal leading-[0.85] tracking-[-0.06em]">
              {p.reais}
            </span>
            <span
              className={cn("pb-1 text-sm", escuro ? "text-white/70" : "text-muted-foreground")}
            >
              {p.centavos}
              <br />
              /mês
            </span>
          </>
        ) : (
          <span className="font-display text-[2.6rem] font-normal leading-[0.95] tracking-[-0.05em]">
            {p.id ? "Mensal" : "Sob medida"}
          </span>
        )}
      </div>

      <div className="relative mt-5 flex flex-wrap gap-1.5 text-[0.8rem] font-medium">
        <span
          className={cn(
            "rounded-full px-3 py-1",
            escuro ? "bg-white/10 text-white" : "bg-brand-soft text-brand-strong",
          )}
        >
          {p.mesas}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1",
            escuro
              ? "border border-white/15 text-white/80"
              : "border border-border text-muted-foreground",
          )}
        >
          {p.implantacao}
        </span>
      </div>

      <a
        href={p.id ? `/cadastro?plano=${p.id}` : "/solicitar-demonstracao?plano=personalizado"}
        className={cn(
          "com-fios relative mt-7 flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors",
          escuro ? "bg-[#0FC9BD] text-[#021E34] hover:bg-[#3ddbd0]" : "btn-tema",
        )}
      >
        {p.id ? "Começar agora" : "Falar com a equipe"}
        <SetaFios />
      </a>

      <div
        className={cn("relative mt-7 border-t pt-6", escuro ? "border-white/12" : "border-border")}
      >
        <p
          className={cn(
            "text-[0.78rem] font-medium uppercase tracking-[0.08em]",
            escuro ? "text-white/55" : "text-muted-foreground",
          )}
        >
          {p.base ? `Tudo do ${p.base}, mais` : "O que inclui"}
        </p>
        <ul className="mt-4 space-y-3 text-[0.95rem] leading-snug">
          {p.itens.map((f) => (
            <li key={f} className="flex gap-3">
              <span
                className={cn(
                  "mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full",
                  escuro ? "bg-[#0FC9BD]/20 text-[#5fe3d9]" : "bg-brand-soft text-brand-strong",
                )}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function CardsPlanos() {
  return (
    <ul
      aria-label="Planos da Tipe"
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden"
    >
      {CARTOES.map((p, i) => (
        <Reveal
          as="li"
          key={p.nome}
          delay={i * 90}
          className="w-[84%] max-w-[22rem] shrink-0 snap-center md:w-auto md:max-w-none"
        >
          <CartaoPlano p={p} />
        </Reveal>
      ))}
    </ul>
  );
}

type Valor = boolean | string;
type Linha = [string, Valor, Valor, Valor];
const COMPARACAO: { grupo: string; linhas: Linha[] }[] = [
  {
    grupo: "Pagamento na mesa",
    linhas: [
      ["QR Code por mesa", true, true, true],
      ["Pix, Apple Pay e Google Pay", true, true, true],
      ["Pagar no estabelecimento", true, true, true],
      ["Divisão da conta por itens", true, true, true],
      ["Gorjeta extra para a equipe", true, true, true],
    ],
  },
  {
    grupo: "Operação",
    linhas: [
      ["Mesas", "até 10", "até 20", "até 40"],
      ["Painel em tempo real", true, true, true],
      ["Lançamento TIPE", true, true, true],
      ["Tipe Order: cardápio e pedidos", true, true, true],
      ["Tipe Equipe: área do garçom e gorjetas", true, true, true],
      ["Tipe Cozinha: cozinha e bar (KDS)", true, true, true],
      ["Relatórios por garçom", false, true, true],
      ["Material de mesa com QR Code", false, true, true],
      ["Controle de caixa", false, false, true],
    ],
  },
  {
    grupo: "Integração e suporte",
    linhas: [
      ["Integração via API TIPE", false, true, true],
      ["Implantação acompanhada", "R$ 200", "R$ 200", "Grátis"],
      ["Suporte prioritário", false, false, true],
    ],
  },
];

function Celula({ v, destaque }: { v: Valor; destaque: boolean }) {
  if (typeof v === "string")
    return <span className="text-[0.8rem] font-medium sm:text-[0.9rem]">{v}</span>;
  return v ? (
    <span
      className={cn(
        "mx-auto grid h-6 w-6 place-items-center rounded-full",
        destaque ? "bg-[#021E34] text-[#0FC9BD]" : "bg-brand-soft text-brand-strong",
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="Incluído" />
    </span>
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Não incluído" />
  );
}

export function ComparacaoPlanos() {
  const popular = PLANS.findIndex((p) => "popular" in p && p.popular);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] table-fixed border-separate border-spacing-0 text-left text-[0.85rem] sm:text-[0.95rem]">
        <caption className="sr-only">Comparação dos planos da Tipe</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-[40%] pb-5 align-bottom text-xs font-normal text-muted-foreground sm:w-[46%] sm:text-sm"
            >
              Recurso
            </th>
            {PLANS.map((p, i) => (
              <th
                key={p.id}
                scope="col"
                className={cn(
                  "px-1 pb-5 pt-4 text-center align-bottom font-normal sm:px-2",
                  i === popular && "rounded-t-2xl bg-[#021E34] text-white",
                )}
              >
                <span className="block font-display text-[0.8rem] font-medium tracking-[-0.02em] min-[400px]:text-[0.9rem] sm:text-[1.15rem]">
                  {p.name}
                </span>
                {SHOW_PLAN_PRICES && (
                  <span
                    className={cn(
                      "money mt-0.5 block whitespace-nowrap text-[0.7rem] sm:text-[0.85rem]",
                      i === popular ? "text-[#5fe3d9]" : "text-muted-foreground",
                    )}
                  >
                    R$&nbsp;{reais(p.fullPrice)}/mês
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        {COMPARACAO.map((g, gi) => (
          <tbody key={g.grupo}>
            <tr>
              <th
                scope="colgroup"
                colSpan={1}
                className="pb-2 pt-8 font-display text-[1.25rem] font-medium tracking-[-0.03em]"
              >
                {g.grupo}
              </th>
              {PLANS.map((p, i) => (
                <td key={p.id} className={cn(i === popular && "bg-[#021E34]/[0.04]")} />
              ))}
            </tr>
            {g.linhas.map(([nome, ...v], li) => {
              const ultima = gi === COMPARACAO.length - 1 && li === g.linhas.length - 1;
              return (
                <tr key={nome}>
                  <th
                    scope="row"
                    className="border-t border-border py-3.5 pr-2 font-normal sm:pr-4"
                  >
                    {nome}
                  </th>
                  {v.map((c, i) => (
                    <td
                      key={i}
                      className={cn(
                        "border-t border-border px-1 py-3.5 text-center sm:px-2",
                        i === popular && "bg-[#021E34]/[0.04]",
                        i === popular && ultima && "rounded-b-2xl",
                      )}
                    >
                      <Celula v={c} destaque={i === popular} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
