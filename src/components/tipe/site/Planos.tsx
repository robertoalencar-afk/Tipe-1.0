/**
 * Planos no formato da página de preços da sunday: cards (o mais escolhido na cor
 * da marca), o que vem em qualquer plano e a comparação detalhada em acordeão.
 * Fonte dos planos: src/lib/tipe/plans.ts (preços só aparecem com SHOW_PLAN_PRICES).
 */
import { Check, ChevronDown, Minus } from "lucide-react";
import { PLANS, SHOW_PLAN_PRICES, TRIAL_DAYS, priceLabel } from "@/lib/tipe/plans";
import { Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";

const CARDS = [
  ...PLANS.map((p) => ({
    id: p.id as string | null,
    nome: p.name,
    preco: SHOW_PLAN_PRICES ? priceLabel(p.price) : null,
    mesas: `${p.maxTables}`,
    popular: "popular" in p ? p.popular : false,
    itens: [...p.features] as string[],
  })),
  {
    id: null,
    nome: "Personalizado",
    preco: null,
    mesas: "40+",
    popular: false,
    itens: ["Integrações sob medida", "Implantação acompanhada", "Condições para redes"],
  },
];

export function CardsPlanos() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((p, i) => (
        <Reveal
          key={p.nome}
          delay={i * 90}
          className={cn(
            "relative flex flex-col rounded-[2rem] p-7 transition-transform duration-500 hover:-translate-y-1",
            p.popular ? "bg-[#0FC9BD] text-[#021E34]" : "border border-border",
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-medium tracking-[-0.03em]">{p.nome}</h3>
            {p.popular && (
              <span className="rounded-full bg-[#021E34] px-3 py-1 text-xs font-medium text-white">
                Mais escolhido
              </span>
            )}
          </div>
          <p className="mt-8 font-display text-[4.2rem] font-normal leading-none tracking-[-0.05em]">
            {p.mesas}
          </p>
          <p className={cn("mt-2 text-sm", p.popular ? "text-[#021E34]/70" : "text-muted-foreground")}>
            {p.id ? "mesas, no máximo" : "mesas ou redes"}
          </p>
          <p
            className={cn(
              "mt-6 border-t pt-5 font-display text-lg font-medium",
              p.popular ? "border-[#021E34]/20" : "border-border",
            )}
          >
            {p.preco ? (
              <span className="money">R$ {p.preco}/mês</span>
            ) : p.id ? (
              "Valores no lançamento"
            ) : (
              "Sob consulta"
            )}
          </p>
          <ul className="mt-5 flex-1 space-y-3 text-[0.95rem]">
            {p.itens.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
          <a
            href="/teste-gratis"
            className={cn(
              "mt-8 flex min-h-12 items-center justify-center rounded-full font-medium",
              p.popular ? "bg-[#021E34] text-white hover:bg-black" : "btn-tema",
            )}
          >
            {p.id ? `Começar com ${TRIAL_DAYS} dias grátis` : "Falar com a equipe"}
          </a>
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
      ["Pix, Apple Pay e Google Pay", true, true, true],
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
      ["Integração assistida com o seu PDV", false, true, true],
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
                    <th key={p.id} className="w-28 py-2 text-center font-normal">
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
                      <td key={i} className="py-3.5 text-center">
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
