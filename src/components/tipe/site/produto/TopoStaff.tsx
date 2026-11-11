/**
 * Topo do Tipe Equipe, na montagem do Staff app da sunday (referência só visual): a foto
 * vertical da garçonete com cantos arredondados e três avisos de vidro escuro translúcido
 * empilhados à direita, na altura do balcão, saindo pela borda direita. O rosto (no alto,
 * à esquerda) e o celular ficam sempre fora da pilha. Entram um a um; com movimento
 * reduzido aparecem parados. Valores demonstrativos, ditos na legenda.
 */
import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { SimboloTipe } from "@/components/tipe/landing/Marcas";
import { cn } from "@/lib/utils";
import { fotoSrc } from "../Foto";
import { useInView } from "@/components/tipe/landing/motion";
import "./produto.css";

function Aviso({
  titulo,
  children,
  atraso,
}: {
  titulo: ReactNode;
  children: ReactNode;
  atraso: number;
}) {
  return (
    <li className="staff-aviso" style={{ "--d": `${atraso}ms` } as CSSProperties}>
      <span className="staff-aviso-icone" aria-hidden>
        <SimboloTipe className="h-[62%] w-[62%] object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="staff-aviso-titulo">{titulo}</span>
        <span className="staff-aviso-texto">{children}</span>
      </span>
      <span className="staff-aviso-quando">agora</span>
    </li>
  );
}

/** A foto com a pilha de avisos e a legenda; usada no topo do Staff e na home. */
export function MontagemStaff({
  className,
  prioridade = false,
}: {
  className?: string;
  prioridade?: boolean;
}) {
  const [ref, dentro] = useInView<HTMLDivElement>("0px");
  const f = fotoSrc("cena-garconete-vertical");
  return (
    <figure className={cn("relative m-0", className)}>
      <div
        ref={ref}
        data-in={dentro || undefined}
        className="staff-montagem relative mx-auto max-w-[34rem]"
      >
        <div className="staff-foto">
          <img
            src={f.src}
            srcSet={f.srcSet}
            sizes="(min-width: 1024px) 34rem, 92vw"
            alt="Garçonete sorrindo ao ver um aviso no celular, apoiada no balcão do salão"
            loading={prioridade ? "eager" : "lazy"}
            fetchPriority={prioridade ? "high" : "auto"}
            decoding="async"
          />
        </div>
        <ol aria-label="Exemplo de avisos do Tipe Equipe" className="staff-avisos">
          <Aviso titulo="Mesa 14 · Conta paga" atraso={350}>
            + <span className="money">R$ 37,80</span> de gorjeta extra para você
          </Aviso>
          <Aviso titulo="Mesa 12 · Avaliação" atraso={900}>
            <span className="inline-flex items-center gap-1.5">
              Cliente deu
              <span
                className="inline-flex gap-[1px] text-[#ffc94d]"
                role="img"
                aria-label="5 de 5 estrelas"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-[0.8em] w-[0.8em] fill-current" aria-hidden />
                ))}
              </span>
            </span>
          </Aviso>
          <Aviso titulo="Saque disponível" atraso={1450}>
            <span className="money">R$ 241,00</span> por Pix no fim do ciclo
          </Aviso>
        </ol>
      </div>
      <figcaption className="mx-auto mt-4 flex max-w-[34rem] items-start gap-2 text-[0.8rem] leading-snug text-muted-foreground">
        <span aria-hidden className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0FC9BD]" />
        Valores demonstrativos. A gorjeta extra é opcional: dos R$ 54,00 deixados na Mesa 14, 70%
        vão para quem atendeu.
      </figcaption>
    </figure>
  );
}

export function TopoStaff({ children }: { children: ReactNode }) {
  return (
    <section data-tema="claro" className="relative -mt-16 overflow-x-clip pt-16">
      <div className="container-page grid items-center gap-12 pb-16 pt-6 sm:pt-10 lg:grid-cols-12 lg:gap-12 lg:pb-24">
        <div className="lg:col-span-6 lg:pr-6">{children}</div>
        <MontagemStaff className="lg:col-span-6 lg:pl-4" prioridade />
      </div>
    </section>
  );
}
