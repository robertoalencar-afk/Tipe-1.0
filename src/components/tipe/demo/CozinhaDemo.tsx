import { AlarmClock, ChefHat, Clock3, Smartphone, UserRound, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import { kitchenQueue, paidPortion, type Station } from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { Segmented } from "./ui";

const COLS = [
  { status: "novo", title: "Novos", action: "Começar", accent: "bg-white/70" },
  { status: "preparo", title: "Em preparo", action: "Pronto", accent: "bg-warning" },
  { status: "pronto", title: "Prontos para servir", action: null, accent: "bg-brand" },
] as const;

/** Tela da cozinha (KDS): fundo escuro para a parede da cozinha, letras grandes, um toque por etapa. */
export function CozinhaDemo() {
  const { state, run } = useDemo();
  const [station, setStation] = useState<Station>("cozinha");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  if (!state) return null;
  const queue = kitchenQueue(state, now, station);
  const late = queue.filter((l) => l.late).length;
  const open = (s: Station) =>
    kitchenQueue(state, now, s).filter((l) => l.status !== "pronto").length;

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] bg-ink p-4 text-white sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Segmented<Station>
            tone="dark"
            value={station}
            onChange={setStation}
            options={[
              {
                id: "cozinha",
                label: (
                  <>
                    <ChefHat className="h-4 w-4" /> Cozinha{" "}
                    <span className="opacity-60">{open("cozinha")}</span>
                  </>
                ),
              },
              {
                id: "bar",
                label: (
                  <>
                    <Wine className="h-4 w-4" /> Bar{" "}
                    <span className="opacity-60">{open("bar")}</span>
                  </>
                ),
              },
            ]}
          />
          {late > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold">
              <AlarmClock className="h-3.5 w-3.5" /> {late} atrasado{late > 1 ? "s" : ""}, mais de{" "}
              {state.restaurant.lateAfterMin} min
            </span>
          )}
          <span className="money ml-auto inline-flex items-center gap-1.5 text-sm text-white/60">
            <Clock3 className="h-4 w-4" />{" "}
            {new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {COLS.map((col) => {
            const items = queue.filter((l) => l.status === col.status);
            return (
              <section key={col.status} className="min-w-0 rounded-2xl bg-white/[0.04] p-2.5">
                <h2 className="mb-2.5 flex items-center gap-2 px-1.5 pt-1 text-[13px] font-semibold text-white/80">
                  <span className={cn("h-2 w-2 rounded-full", col.accent)} aria-hidden />
                  {col.title}
                  <span className="ml-auto text-white/45">{items.length}</span>
                </h2>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="px-1 py-8 text-center text-xs text-white/35">Nada aqui</p>
                  )}
                  {items.map((l) => {
                    const paid = paidPortion(state, l.id) >= l.qty;
                    const source = state.orders.find((o) => o.id === l.orderId)?.source;
                    return (
                      <article
                        key={l.id}
                        className={cn(
                          "demo-fade relative overflow-hidden rounded-xl bg-white p-3.5 pl-4 text-ink",
                          l.late && "ring-2 ring-destructive",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-y-0 left-0 w-1",
                            l.late
                              ? "bg-destructive"
                              : col.accent === "bg-white/70"
                                ? "bg-ink/20"
                                : col.accent,
                          )}
                        />
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-display text-[15px] font-semibold">
                            Mesa {l.table}
                          </span>
                          <span
                            className={cn(
                              "money inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                              l.late
                                ? "bg-destructive text-white"
                                : "bg-[oklch(0.95_0.005_250)] text-muted-foreground",
                            )}
                          >
                            {l.waitMin} min
                          </span>
                        </div>
                        <p className="mt-2 font-display text-[19px] font-semibold leading-tight">
                          {l.qty}× {l.name}
                        </p>
                        {l.addons.length > 0 && (
                          <p className="mt-1 text-[13px] font-medium">
                            +{" "}
                            {l.addons
                              .map(
                                (a) =>
                                  state.menu
                                    .find((m) => m.id === l.menuId)
                                    ?.addons.find((x) => x.id === a)?.name,
                              )
                              .join(", ")}
                          </p>
                        )}
                        {l.notes && (
                          <p className="mt-1.5 rounded-lg bg-warning/25 px-2 py-1 text-[13px] font-semibold">
                            {l.notes}
                          </p>
                        )}
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            {source === "qr" ? (
                              <Smartphone className="h-3 w-3" />
                            ) : (
                              <UserRound className="h-3 w-3" />
                            )}
                            {source === "qr" ? "pelo celular" : "pelo garçom"}
                          </span>
                          {l.seat ? <span>· lugar {l.seat}</span> : null}
                          <span
                            className={cn(
                              "ml-auto rounded-full px-1.5 py-px font-semibold",
                              paid
                                ? "bg-success/15 text-[oklch(0.42_0.12_150)]"
                                : "bg-[oklch(0.95_0.005_250)]",
                            )}
                          >
                            {paid ? "Já pago" : "Conta aberta"}
                          </span>
                        </p>
                        {col.action && (
                          <button
                            type="button"
                            onClick={() =>
                              run({
                                type: "advanceLine",
                                actor: "cozinha",
                                lineId: l.id,
                                at: Date.now(),
                              })
                            }
                            className={cn(
                              "mt-3 h-10 w-full rounded-full text-[14px] font-semibold transition active:scale-[0.985]",
                              col.status === "novo" ? "bg-ink text-white" : "bg-brand text-ink",
                            )}
                          >
                            {col.action}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-border/70 bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold">Disponibilidade do cardápio</h2>
          <p className="text-xs text-muted-foreground">
            Acabou um ingrediente? Desligue o item: ele some do pedido pelo celular na hora.
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {state.menu
            .filter((m) => m.station === station)
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 px-3.5 py-2.5 text-[13px]"
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    !m.available && "text-muted-foreground line-through",
                  )}
                >
                  {m.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {m.available ? "Disponível" : "Esgotado"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={m.available}
                  aria-label={`${m.name} disponível`}
                  onClick={() =>
                    run({
                      type: "setAvailability",
                      actor: "cozinha",
                      menuId: m.id,
                      available: !m.available,
                    })
                  }
                  className={cn(
                    "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                    m.available ? "bg-success" : "bg-[oklch(0.88_0.008_250)]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]",
                      m.available ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
