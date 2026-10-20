/** Grade colorida de integrações (o bloco escuro de integrações da sunday, só com o que é real). */
import { Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { INTEGRACOES } from "./produtos";

const CORES = ["#0FC9BD", "#021E34", "#f4b860", "#e9e4dc", "#7fd4f5", "#1d2b27", "#cfd8dc", "#cfd8dc"];

export function GradeIntegracoes({ compacta = false }: { compacta?: boolean }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3", compacta ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
      {INTEGRACOES.map((it, i) => {
        const escuro = ["#021E34", "#1d2b27"].includes(CORES[i]!);
        return (
          <Reveal as="li" key={it.nome} delay={(i % 4) * 90}>
            <div
              className={cn(
                "flex aspect-square flex-col justify-between rounded-[1.5rem] p-5 transition-transform duration-500 hover:-translate-y-1 sm:p-6",
                escuro ? "text-white" : "text-[#021E34]",
                it.status === "em-breve" && "opacity-70",
              )}
              style={{ background: CORES[i] }}
            >
              <span className="text-xs font-medium opacity-70">
                {it.tipo} · {it.status === "disponivel" ? "Disponível" : "Em breve"}
              </span>
              <span className={cn("font-display font-medium leading-[0.95] tracking-[-0.04em]", compacta ? "text-[clamp(1.15rem,0.95rem+0.6vw,1.45rem)]" : "text-[clamp(1.4rem,1rem+1.4vw,2.1rem)]")}>
                {it.nome}
              </span>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}


/** Lista da página de integrações: agrupada por tipo, com status e o que cada uma faz. */
export function ListaIntegracoes() {
  const grupos = [
    { t: "Pagamentos", d: "Como o dinheiro chega na conta do restaurante.", tipos: ["Pagamento", "Processamento"] },
    { t: "Sistema do restaurante", d: "Como os pedidos entram na conta da mesa.", tipos: ["PDV"] },
  ];
  return (
    <div className="space-y-14">
      {grupos.map((g) => (
        <div key={g.t} className="grid gap-6 lg:grid-cols-[0.6fr_1.4fr] lg:gap-14">
          <div>
            <p className="font-display text-[1.7rem] tracking-[-0.03em]">{g.t}</p>
            <p className="mt-2 text-muted-foreground">{g.d}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {INTEGRACOES.filter((it) => g.tipos.includes(it.tipo)).map((it, i) => (
              <Reveal
                as="li"
                key={it.nome}
                delay={(i % 2) * 90}
                className="flex gap-4 rounded-[1.5rem] border border-border p-5"
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-medium"
                  style={{ background: CORES[INTEGRACOES.indexOf(it)], color: ["#021E34", "#1d2b27"].includes(CORES[INTEGRACOES.indexOf(it)]!) ? "#fff" : "#021E34" }}
                >
                  {it.nome.replace(/[^A-Za-zÀ-ú]/g, "").slice(0, 2)}
                </span>
                <span>
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {it.nome}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                        it.status === "disponivel" ? "bg-brand/15 text-brand-strong" : "bg-background-muted text-muted-foreground",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", it.status === "disponivel" ? "bg-brand" : "bg-muted-foreground")} />
                      {it.status === "disponivel" ? "Disponível" : "Em breve"}
                    </span>
                  </span>
                  <span className="mt-1 block text-[0.95rem] leading-relaxed text-muted-foreground">{it.d}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
