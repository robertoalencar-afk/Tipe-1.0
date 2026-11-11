/**
 * "Uma mesa, cinco ganhos de tempo": cinco cards com mini telas que se movem sozinhas
 * quando entram na tela (sem foto, sem texto gigante rolando). Todos os valores são
 * exemplos da Mesa 12 do simulador; nada aqui é resultado real de restaurante.
 */
/* eslint-disable react-hooks/rules-of-hooks -- cada CardVivo chama sempre os mesmos hooks, na mesma ordem */
import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { useMovimentoReduzido, useVisivel } from "@/components/tipe/site/produto/useVisivel";
import { cn } from "@/lib/utils";

/** Passo que avança em loop enquanto o card está visível; parado no último com movimento reduzido. */
function usePasso(total: number, ms: number, visivel: boolean, reduz: boolean) {
  const [i, setI] = useState(reduz ? total - 1 : 0);
  useEffect(() => {
    if (reduz) {
      setI(total - 1);
      return;
    }
    if (!visivel) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % total), ms);
    return () => window.clearInterval(t);
  }, [total, ms, visivel, reduz]);
  return i;
}

function useCard() {
  const [ref, visivel] = useVisivel<HTMLDivElement>("0px 0px -10% 0px");
  const reduz = useMovimentoReduzido();
  return { ref, visivel, reduz };
}

/** Card que sabe se está na tela: entrega `visivel` e `reduz` a quem o desenha. */
function CardVivo({
  children,
  ...p
}: {
  titulo: string;
  texto: string;
  className?: string;
  children: (v: { visivel: boolean; reduz: boolean }) => ReactNode;
}) {
  const { ref, visivel, reduz } = useCard();
  return (
    <Card cardRef={ref} {...p}>
      {children({ visivel, reduz })}
    </Card>
  );
}

function Card({
  cardRef,
  titulo,
  texto,
  className,
  children,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  titulo: string;
  texto: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-[2rem] border border-border bg-surface p-6 sm:p-8",
        className,
      )}
    >
      <div className="min-h-[9.5rem] flex-1">{children}</div>
      <h3 className="mt-6 font-display text-2xl font-medium leading-tight tracking-[-0.02em]">
        {titulo}
      </h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{texto}</p>
    </div>
  );
}

/* 1. Mesas giram mais rápido: a barra da espera encolhe. */
function Giro() {
  return (
    <CardVivo
      titulo="Mesas giram mais rápido."
      texto="O cliente pede a conta, paga no celular e libera a mesa sem esperar a maquininha chegar."
      className="lg:col-span-7"
    >
      {({ visivel, reduz }) => {
        const p = usePasso(2, 2600, visivel, reduz);
        const rapido = p === 1;
        return (
          <div className="space-y-5" aria-hidden>
            {[
              { rot: "Esperando a maquininha", w: "100%", cor: "bg-foreground/15", tempo: "ilustração" },
              { rot: "Pagando pelo QR Code da mesa", w: rapido ? "26%" : "100%", cor: "bg-brand", tempo: "" },
            ].map((b, k) => (
              <div key={b.rot}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{b.rot}</span>
                  {k === 0 && <span className="text-muted-foreground">exemplo ilustrativo</span>}
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-[1400ms] ease-out", b.cor)}
                    style={{ width: k === 0 ? "100%" : b.w }}
                  />
                </div>
              </div>
            ))}
            <p className="flex items-center gap-2 text-sm font-medium">
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full bg-brand text-ink transition-all duration-500",
                  rapido ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              Mesa liberada para o próximo cliente
            </p>
          </div>
        );
      }}
    </CardVivo>
  );
}

/* 2. Cada um paga o seu: três partes iguais da Mesa 12 vão sendo quitadas. */
function Dividir() {
  const pessoas = ["Camila", "Diego", "Larissa"];
  return (
    <CardVivo
      titulo="Cada um paga o seu."
      texto="Por item, dividindo um prato ou em partes iguais. Quem sai primeiro não deixa a conta para os outros."
      className="lg:col-span-5"
    >
      {({ visivel, reduz }) => {
        const p = usePasso(5, 1100, visivel, reduz);
        return (
          <div aria-hidden>
            <p className="text-sm text-muted-foreground">Mesa 12 · R$ 356,40</p>
            <ul className="mt-3 space-y-2.5">
              {pessoas.map((n, k) => {
                const pago = p > k;
                return (
                  <li
                    key={n}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground/[0.07] text-sm font-medium">
                      {n[0]}
                    </span>
                    <span className="flex-1 font-medium">{n}</span>
                    <span className="tabular-nums">R$ 118,80</span>
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full transition-all duration-500",
                        pago ? "scale-100 bg-brand text-ink" : "scale-90 bg-foreground/10 text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }}
    </CardVivo>
  );
}

/* 3. Gorjeta extra: 70% para quem atendeu (regra do produto). */
function Gorjeta() {
  return (
    <CardVivo
      titulo="A gorjeta extra chega para quem atendeu."
      texto="70% da gorjeta extra vai para o saldo do garçom da mesa e 30% para a Tipe, com saque por Pix a cada quinzena."
      className="lg:col-span-4"
    >
      {({ visivel, reduz }) => {
        const cheio = visivel || reduz;
        return (
          <div aria-hidden>
            <p className="text-sm text-muted-foreground">Exemplo: gorjeta extra de R$ 10,00</p>
            <div className="mt-4 flex h-14 overflow-hidden rounded-2xl text-sm font-medium">
              <div
                className="grid place-items-center bg-brand text-ink transition-[width] duration-[1600ms] ease-out"
                style={{ width: cheio ? "70%" : "0%" }}
              >
                {cheio && "R$ 7,00"}
              </div>
              <div className="grid flex-1 place-items-center bg-foreground/[0.08]">
                {cheio && "R$ 3,00"}
              </div>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="font-medium">Seu saldo (70%)</span>
              <span className="text-muted-foreground">Tipe (30%)</span>
            </div>
          </div>
        );
      }}
    </CardVivo>
  );
}

/* 4. Conta clara: os itens escolhidos somam o total a pagar. */
function ContaClara() {
  const itens: [string, number][] = [
    ["Moqueca de peixe", 148.0],
    ["Caipirinha", 32.0],
    ["Água com gás", 14.0],
  ];
  return (
    <CardVivo
      titulo="A conta fica clara no celular."
      texto="Cada item, a taxa de serviço e o total a pagar aparecem antes de qualquer toque."
      className="lg:col-span-4"
    >
      {({ visivel, reduz }) => {
        const p = usePasso(itens.length + 2, 1200, visivel, reduz);
        const marcados = Math.min(p, itens.length);
        const soma = itens.slice(0, marcados).reduce((s, [, v]) => s + v, 0);
        return (
          <div aria-hidden>
            <ul className="space-y-2">
              {itens.map(([n, v], k) => (
                <li key={n} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-md border transition-colors duration-300",
                      k < marcados ? "border-brand bg-brand text-ink" : "border-border",
                    )}
                  >
                    {k < marcados && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{n}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total a pagar</span>
              <span className="font-display text-2xl tabular-nums">
                {soma.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>
        );
      }}
    </CardVivo>
  );
}

/* 5. Salão numa tela: o mapa de mesas muda de estado. */
const ESTADOS = [
  ["o", "o", "l", "o", "o", "o", "o", "l"],
  ["o", "p", "l", "o", "o", "o", "p", "l"],
  ["l", "p", "l", "o", "p", "o", "p", "o"],
  ["l", "o", "o", "o", "p", "l", "p", "o"],
] as const;
const COR = { o: "bg-[#2563eb]", p: "bg-brand", l: "bg-foreground/20" } as const;
const ROT = { o: "Ocupada", p: "Pagando", l: "Livre" } as const;

function Salao() {
  return (
    <CardVivo
      titulo="O salão inteiro numa tela só."
      texto="Mesas, pagamentos e equipe em tempo real, no computador, no tablet ou no celular."
      className="lg:col-span-4"
    >
      {({ visivel, reduz }) => {
        const p = usePasso(ESTADOS.length, 1800, visivel, reduz);
        const atual = ESTADOS[p]!;
        const abertas = atual.filter((s) => s !== "l").length;
        return (
          <div aria-hidden>
            <div className="grid grid-cols-4 gap-2.5">
              {atual.map((s, k) => (
                <div
                  key={k}
                  className="rounded-xl border border-border bg-background p-2.5 text-xs transition-colors"
                >
                  <p className="font-medium">Mesa {k + 1}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full transition-colors duration-500", COR[s])} />
                    {ROT[s]}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              Ao vivo · {abertas} de 8 mesas abertas
            </p>
          </div>
        );
      }}
    </CardVivo>
  );
}

export function ResultadosMesa() {
  return (
    <section aria-labelledby="resultados" className="container-page py-20 sm:py-28">
      <p className="font-display text-[clamp(1.2rem,1rem+0.8vw,1.6rem)] text-brand-strong">
        O que muda na sua mesa
      </p>
      <h2
        id="resultados"
        className="mt-3 max-w-3xl font-display text-[clamp(2.4rem,1.4rem+3.4vw,4.6rem)] font-medium leading-[1]"
      >
        Do QR Code à mesa livre, sem espera.
      </h2>
      <div className="mt-12 grid gap-5 lg:grid-cols-12">
        <Giro />
        <Dividir />
        <Gorjeta />
        <ContaClara />
        <Salao />
      </div>
    </section>
  );
}
