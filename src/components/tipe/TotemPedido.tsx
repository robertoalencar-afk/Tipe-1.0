import type { Dispatch, SetStateAction } from "react";
import { Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed } from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TotemContext } from "@/lib/tipe/totem.functions";
import type { carrinhoParaPedido } from "@/lib/tipe/pdv/comanda";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** A mesma tela no terminal e na vitrine pública; a vitrine fornece apenas dados locais. */
export function TotemPedido({
  ctx,
  cat,
  carrinho,
  linhas,
  precoDe,
  add,
  reiniciar,
  setCat,
  setCarrinho,
  nome,
  setNome,
  total,
  enviando,
  finalizar,
  qtdTotal,
}: {
  ctx: TotemContext;
  cat: string;
  carrinho: Record<string, number>;
  linhas: ReturnType<typeof carrinhoParaPedido>;
  precoDe: (code: string) => number;
  add: (code: string, delta: number) => void;
  reiniciar: () => void;
  setCat: (cat: string) => void;
  setCarrinho: Dispatch<SetStateAction<Record<string, number>>>;
  nome: string;
  setNome: (nome: string) => void;
  total: number;
  enviando: boolean;
  finalizar: () => void;
  qtdTotal: number;
}) {
  const itens = ctx.items.filter((i) => !cat || i.categoryId === cat);
  return (
    <div className="customer-theme flex min-h-svh flex-col bg-background text-foreground">
      <header
        className="flex items-center justify-between gap-3 px-6 py-4"
        style={{ background: "var(--gradient-brand)", color: "var(--secondary-foreground)" }}
      >
        <TipeLogo className="h-9" />
        <span className="font-display text-xl font-bold">{ctx.restaurantName}</span>
        <button
          type="button"
          onClick={reiniciar}
          className="rounded-full bg-secondary-foreground/10 px-4 py-2 text-sm font-semibold"
        >
          Cancelar
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-border p-3">
          <CatBtn on={!cat} onClick={() => setCat("")}>
            Tudo
          </CatBtn>
          {ctx.categories.map((c) => (
            <CatBtn key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name}
            </CatBtn>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {itens.map((i) => {
              const q = carrinho[i.code] ?? 0;
              return (
                <div
                  key={i.id}
                  className={`flex flex-col rounded-2xl border-2 bg-card p-4 ${q > 0 ? "border-primary" : "border-border"}`}
                >
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold leading-tight">{i.name}</p>
                    {i.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                    )}
                  </div>
                  <p className="mt-2 font-display text-xl font-extrabold">{money(i.price)}</p>
                  {q > 0 ? (
                    <div className="mt-3 flex items-center justify-between">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-12 w-12"
                        aria-label={`Menos um ${i.name}`}
                        onClick={() => add(i.code, -1)}
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <span className="font-display text-2xl font-bold tabular-nums">{q}</span>
                      <Button
                        size="icon"
                        className="h-12 w-12"
                        aria-label={`Mais um ${i.name}`}
                        onClick={() => add(i.code, 1)}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  ) : (
                    <Button className="mt-3 h-12 text-base" onClick={() => add(i.code, 1)}>
                      <Plus className="mr-1 h-5 w-5" />
                      Adicionar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        <aside className="flex w-80 shrink-0 flex-col border-l border-border">
          <h2 className="flex items-center gap-2 border-b border-border p-4 font-display text-lg font-bold">
            <ShoppingBag className="h-5 w-5" />
            Seu pedido
          </h2>
          <div className="flex-1 overflow-y-auto p-4">
            {linhas.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Toque nos itens para montar seu pedido.
              </p>
            ) : (
              <ul className="space-y-3">
                {linhas.map((l) => {
                  const it = ctx.items.find((i) => i.code === l.code);
                  return (
                    <li key={l.code} className="flex items-start justify-between gap-2 text-sm">
                      <span>
                        <b>{l.qty}×</b> {it?.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {money(precoDe(l.code) * l.qty)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${it?.name}`}
                          onClick={() => setCarrinho((x) => ({ ...x, [l.code]: 0 }))}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="space-y-3 border-t border-border p-4">
            <Input
              placeholder="Seu nome (opcional)"
              maxLength={40}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-12"
            />
            <div className="flex items-center justify-between font-display text-xl font-extrabold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <Button
              className="h-16 w-full text-lg font-bold"
              disabled={!linhas.length || enviando}
              onClick={finalizar}
            >
              {enviando ? (
                "Enviando…"
              ) : (
                <>
                  <UtensilsCrossed className="mr-2 h-5 w-5" />
                  Finalizar · {qtdTotal} {qtdTotal === 1 ? "item" : "itens"}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Você recebe uma senha e paga no caixa.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CatBtn({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-3 text-left font-semibold ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}
