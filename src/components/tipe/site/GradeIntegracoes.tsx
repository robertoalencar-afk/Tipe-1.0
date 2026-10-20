/** Grade colorida de integrações (o bloco escuro de integrações da sunday, só com o que é real). */
import { Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { INTEGRACOES } from "./produtos";

const CORES = ["#0FC9BD", "#021E34", "#f4b860", "#e9e4dc", "#7fd4f5", "#1d2b27", "#cfd8dc", "#cfd8dc"];

export function GradeIntegracoes({ compacta = false }: { compacta?: boolean }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3", compacta ? "sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-4")}>
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
              <span className={cn("font-display font-medium leading-[0.95] tracking-[-0.04em] [overflow-wrap:anywhere]", compacta ? "text-[clamp(1.25rem,1rem+0.7vw,1.6rem)]" : "text-[clamp(1.4rem,1rem+1.4vw,2.1rem)]")}>
                {it.nome}
              </span>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}

