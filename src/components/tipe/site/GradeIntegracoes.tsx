/**
 * Integrações da Tipe: grade, lista por status e o hub animado.
 * Fonte única: integracoes/dados.ts (tabela de verdade conferida no código).
 */
import { Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { INTEGRACOES_V5, STATUS_ROTULO, type StatusIntegracao } from "./integracoes/dados";
import { ICONE_INTEGRACAO } from "./integracoes/FaixaDupla";
import { Plug } from "lucide-react";

export { HubIntegracoes } from "./integracoes/HubIntegracoes";
export { FaixaDuplaIntegracoes } from "./integracoes/FaixaDupla";

function Selo({ status }: { status: StatusIntegracao }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium",
        status === "disponivel" && "bg-brand/15 text-brand-strong",
        status === "desenvolvimento" && "border border-dashed border-brand/60 text-brand-strong",
        status === "planejada" && "border border-border text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "disponivel" && "bg-brand",
          status === "desenvolvimento" && "border border-brand",
          status === "planejada" && "bg-muted-foreground/50",
        )}
      />
      {STATUS_ROTULO[status]}
    </span>
  );
}

/** Grade de cartões, só com o que está disponível hoje. */
export function GradeIntegracoes({ compacta = false }: { compacta?: boolean }) {
  const itens = INTEGRACOES_V5.filter((i) => i.status === "disponivel");
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3",
        compacta ? "sm:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-5",
      )}
    >
      {itens.map((it, i) => {
        const Icone = ICONE_INTEGRACAO[it.nome] ?? Plug;
        return (
          <Reveal as="li" key={it.nome} delay={(i % 5) * 80}>
            <div className="flex h-full min-h-36 flex-col justify-between gap-6 rounded-[1.5rem] border border-border p-5">
              <Icone className="h-5 w-5 text-brand-strong" strokeWidth={1.8} aria-hidden />
              <span>
                <span className="block text-xs text-muted-foreground">{it.grupo}</span>
                <span className="mt-1 block font-display text-[1.3rem] font-medium leading-tight tracking-[-0.03em]">
                  {it.nome}
                </span>
              </span>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}

const GRUPOS: { status: StatusIntegracao; t: string; d: string }[] = [
  { status: "disponivel", t: "Disponível", d: "Funciona hoje, em produção." },
  {
    status: "desenvolvimento",
    t: "Em desenvolvimento",
    d: "A base já está no código. Nenhum restaurante usa ainda.",
  },
  { status: "planejada", t: "Planejada", d: "No plano, sem data. Nada aqui está pronto." },
];

/** Lista da página de integrações: agrupada por status, com o que cada uma faz. */
export function ListaIntegracoes() {
  return (
    <div className="space-y-14 sm:space-y-16">
      {GRUPOS.map((g) => (
        <div key={g.status} className="grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-14">
          <div>
            <Selo status={g.status} />
            <p className="mt-3 font-display text-[1.7rem] tracking-[-0.03em]">{g.t}</p>
            <p className="mt-2 text-muted-foreground">{g.d}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {INTEGRACOES_V5.filter((it) => it.status === g.status).map((it, i) => {
              const Icone = ICONE_INTEGRACAO[it.nome] ?? Plug;
              return (
                <Reveal
                  as="li"
                  key={it.nome}
                  delay={(i % 2) * 90}
                  className={cn(
                    "flex gap-4 rounded-[1.5rem] border p-5",
                    g.status === "disponivel" ? "border-border" : "border-dashed border-border",
                    g.status === "planejada" && "opacity-80",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                      g.status === "disponivel"
                        ? "bg-[#0FC9BD] text-[#021E34]"
                        : "bg-background-muted text-muted-foreground",
                    )}
                  >
                    <Icone className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-medium">{it.nome}</span>
                    <span className="block text-xs text-muted-foreground">{it.grupo}</span>
                    <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-muted-foreground">
                      {it.d}
                    </span>
                  </span>
                </Reveal>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
