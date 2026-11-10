/**
 * Planos no formato da página de preços da sunday: cards (o mais escolhido na cor
 * da marca), o que vem em qualquer plano e a comparação detalhada em acordeão.
 * Fonte dos planos: src/lib/tipe/plans.ts (preços só aparecem com SHOW_PLAN_PRICES).
 */
import { Check, ChevronDown, Minus } from "lucide-react";
import { PLANS, SHOW_PLAN_PRICES, TRIAL_DAYS, priceLabel } from "@/lib/tipe/plans";
import { Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";

const PARA: Record<string, string> = {
  essencial: "Para bares, cafés e casas pequenas.",
  profissional: "Para restaurantes com equipe e PDV.",
  premium: "Para casas grandes com cozinha e bar.",
};

const CARDS = [
  ...PLANS.map((p) => ({
    id: p.id as string | null,
    nome: p.name,
    preco: SHOW_PLAN_PRICES ? priceLabel(p.price) : null,
    mesas: `${p.maxTables}`,
    popular: "popular" in p ? p.popular : false,
    itens: [...p.features] as string[],
    para: PARA[p.id] ?? "",
  })),
  {
    id: null,
    nome: "Personalizado",
    preco: null,
    mesas: "40+",
    popular: false,
    itens: ["Integrações sob medida", "Implantação acompanhada", "Condições para redes"],
    para: "Para redes e casas com mais de 40 mesas.",
  },
];

export function CardsPlanos() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((p, i) => (
        <Reveal
          key={p.nome}
          delay={i * 90}
          className={cn(
            "relative flex flex-col rounded-[1.75rem] p-6 transition-transform duration-500 hover:-translate-y-1 sm:p-7",
            p.popular ? "bg-[#021E34] text-white" : "bg-background-muted",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-[1.6rem] font-normal tracking-[-0.03em]">{p.nome}</h3>
          </div>
          <p
            className={cn(
              "mt-1 text-[0.95rem]",
              p.popular ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {p.para}
          </p>
          <div className="mt-8 flex items-end gap-2">
            <p className="font-display text-[4.6rem] font-normal leading-[0.8] tracking-[-0.06em]">
              {p.mesas}
            </p>
            <p
              className={cn(
                "pb-1 text-sm leading-tight",
                p.popular ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {p.id ? (
                <>
                  mesas
                  <br />
                  no máximo
                </>
              ) : (
                <>
                  mesas
                  <br />
                  ou redes
                </>
              )}
            </p>
          </div>
          <p
            className={cn(
              "mt-6 text-[0.95rem] font-medium",
              p.popular ? "text-[#0FC9BD]" : "text-brand-strong",
            )}
          >
            {p.preco ? (
              <span className="money">R$ {p.preco}/mês</span>
            ) : p.id ? (
              "Assinatura mensal · valor no lançamento"
            ) : (
              "Sob consulta"
            )}
          </p>
          <a
            href={`/teste-gratis?plano=${p.id ?? "personalizado"}`}
            className={cn(
              "mt-5 flex min-h-12 items-center justify-center rounded-full font-medium",
              p.popular ? "bg-white text-[#021E34] hover:bg-white/90" : "btn-tema",
            )}
          >
            {p.id ? `Solicitar ${TRIAL_DAYS} dias grátis` : "Falar com a equipe"}
          </a>
          <p
            className={cn(
              "mt-7 text-xs font-medium uppercase tracking-[0.08em]",
              p.popular ? "text-white/60" : "text-muted-foreground",
            )}
          >
            O que inclui
          </p>
          <ul className="mt-3 flex-1 space-y-2.5 text-[0.95rem]">
            {p.itens.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    p.popular ? "text-[#0FC9BD]" : "text-brand-strong",
                  )}
                  strokeWidth={2.5}
                />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

type Linha = [string, boolean | string, boolean | string, boolean | string];
const COMPARACAO: { grupo: string; linhas: Linha[] }[] = [
  {
    grupo: "Pagamento na mesa",
    linhas: [
      ["QR Code por mesa", true, true, true],
      ["Pix, Apple Pay e Google Pay", "Em piloto", "Em piloto", "Em piloto"],
      ["Pagar no estabelecimento", true, true, true],
      ["Divisão da conta", true, true, true],
      ["Gorjeta extra para a equipe", true, true, true],
    ],
  },
  {
    grupo: "Gestão",
    linhas: [
      ["Mesas", "até 10", "até 20", "até 40"],
      ["Painel em tempo real", true, true, true],
      ["Lançamento TIPE", true, true, true],
      ["Relatórios por garçom", false, true, true],
      ["Totens personalizados", false, true, true],
      ["Controle de caixa", false, false, true],
    ],
  },
  {
    grupo: "Operação e suporte",
    linhas: [
      ["Integração via API TIPE", false, "Sob análise", "Sob análise"],
      ["Cozinha e bar (KDS)", false, false, true],
      ["Suporte prioritário", false, false, true],
    ],
  },
];

function Celula({ v }: { v: boolean | string }) {
  if (typeof v === "string") return <span className="text-sm font-medium">{v}</span>;
  return v ? (
    <Check className="mx-auto h-5 w-5 text-brand-strong" strokeWidth={2.5} aria-label="Incluído" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label="Não incluído" />
  );
}

export function ComparacaoPlanos() {
  return (
    <div className="divide-y divide-border border-y border-border">
      {COMPARACAO.map((g, gi) => (
        <details key={g.grupo} open={gi === 0} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between py-6 font-display text-[1.4rem] font-medium tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
            {g.grupo}
            <ChevronDown className="h-5 w-5 transition-transform duration-500 group-open:rotate-180" />
          </summary>
          <div className="overflow-x-auto pb-6">
            <table className="w-full min-w-[34rem] text-left text-[0.95rem]">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th className="py-2 font-normal">Recurso</th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className={cn(
                        "w-28 py-2 text-center font-normal",
                        "popular" in p && "font-medium text-foreground",
                      )}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.linhas.map(([nome, ...v]) => (
                  <tr key={nome} className="border-t border-border/70">
                    <td className="py-3.5 pr-4">{nome}</td>
                    {v.map((c, i) => (
                      <td
                        key={i}
                        className={cn("py-3.5 text-center", i === 1 && "bg-brand/[0.07]")}
                      >
                        <Celula v={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}
