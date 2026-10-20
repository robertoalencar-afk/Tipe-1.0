import { AlarmClock, ChefHat, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { kitchenQueue, type Station } from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { Pill } from "./DemoShell";

const COLS = [
  { status: "novo", title: "Novos", action: "Começar" },
  { status: "preparo", title: "Em preparo", action: "Pronto" },
  { status: "pronto", title: "Prontos para servir", action: null },
] as const;

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["cozinha", "bar"] as Station[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStation(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold",
              station === s ? "bg-ink text-white" : "bg-surface",
            )}
          >
            {s === "cozinha" ? <ChefHat className="h-4 w-4" /> : <Wine className="h-4 w-4" />}{" "}
            {s === "cozinha" ? "Cozinha" : "Bar"}{" "}
            <span className="text-xs opacity-70">
              {kitchenQueue(state, now, s).filter((l) => l.status !== "pronto").length}
            </span>
          </button>
        ))}
        {late > 0 && (
          <Pill tone="danger">
            <AlarmClock className="h-3 w-3" /> {late} atrasado{late > 1 ? "s" : ""} (mais de{" "}
            {state.restaurant.lateAfterMin} min)
          </Pill>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map((col) => {
          const items = queue.filter((l) => l.status === col.status);
          return (
            <section key={col.status} className="rounded-2xl bg-surface p-3 shadow-xs">
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">
                {col.title}
                <span className="text-muted-foreground">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
                )}
                {items.map((l) => (
                  <article
                    key={l.id}
                    className={cn(
                      "rounded-xl border p-3",
                      l.late ? "border-destructive/50 bg-destructive/5" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-base font-semibold">
                        {l.qty}× {l.name}
                      </p>
                      <span
                        className={cn(
                          "money text-xs font-semibold",
                          l.late ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {l.waitMin} min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mesa {l.table}
                      {l.seat ? ` · lugar ${l.seat}` : ""} ·{" "}
                      {state.orders.find((o) => o.id === l.orderId)?.source === "qr"
                        ? "pelo celular"
                        : "pelo garçom"}
                    </p>
                    {l.addons.length > 0 && (
                      <p className="mt-1 text-xs">
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
                      <p className="mt-1 rounded-md bg-warning/15 px-2 py-1 text-xs font-medium">
                        {l.notes}
                      </p>
                    )}
                    {col.action && (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() =>
                          run({
                            type: "advanceLine",
                            actor: "cozinha",
                            lineId: l.id,
                            at: Date.now(),
                          })
                        }
                      >
                        {col.action}
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-semibold">Disponibilidade do cardápio</h2>
        <p className="text-xs text-muted-foreground">
          Acabou um ingrediente? Desligue o item: ele some do pedido pelo celular na hora.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {state.menu
            .filter((m) => m.station === station)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  run({
                    type: "setAvailability",
                    actor: "cozinha",
                    menuId: m.id,
                    available: !m.available,
                  })
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  m.available
                    ? "bg-success/15 text-[oklch(0.42_0.12_150)]"
                    : "bg-destructive/10 text-destructive line-through",
                )}
              >
                {m.name}
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
