import {
  ArrowLeft,
  Check,
  ChevronRight,
  Minus,
  Plus,
  QrCode,
  Receipt,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  brlCents,
  METHOD_LABEL,
  previewCents,
  shareItems,
  TIP_MIN_CENTS,
  TIP_PERCENTS,
  tableView,
  totalCents,
  type CartItem,
  type DemoState,
  type Method,
  type PayMode,
} from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { newKey, Pill } from "./DemoShell";

type Step = "qr" | "app" | "checkout" | "processando" | "pronto";
type Tab = "cardapio" | "pedidos" | "conta";

const STATUS_LABEL = {
  novo: "Recebido",
  preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Servido",
  cancelado: "Cancelado",
} as const;
const STATUS_TONE = {
  novo: "neutral",
  preparo: "warning",
  pronto: "brand",
  entregue: "success",
  cancelado: "danger",
} as const;
const METHODS: Method[] = ["pix", "apple_pay", "google_pay", "estabelecimento"];

export function ClienteDemo({
  mesa,
  onMesa,
}: {
  mesa: number | null;
  onMesa: (n: number | null) => void;
}) {
  const { state } = useDemo();
  if (!state)
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">Carregando a demonstração…</p>
    );
  if (mesa === null || !state.tables.some((t) => t.number === mesa))
    return <QrPicker state={state} onPick={onMesa} />;
  return <TableApp key={mesa} state={state} mesa={mesa} onLeave={() => onMesa(null)} />;
}

function QrPicker({ state, onPick }: { state: DemoState; onPick: (n: number) => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-heading">
        Escaneie o QR da mesa
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Na vida real, a câmera do celular abre a conta direto. Aqui, toque numa mesa do{" "}
        {state.restaurant.name}.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {state.tables.map((t) => {
          const v = tableView(state, t.number);
          return (
            <button
              key={t.number}
              type="button"
              onClick={() => onPick(t.number)}
              className="surface-card flex flex-col items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-white">
                <QrCode className="h-6 w-6" aria-hidden />
              </span>
              <span className="font-display text-lg font-semibold">Mesa {t.number}</span>
              <Pill
                tone={v.state === "livre" ? "neutral" : v.state === "quitada" ? "success" : "brand"}
              >
                {v.state === "livre"
                  ? "Livre"
                  : v.state === "quitada"
                    ? "Quitada"
                    : `Conta ${brlCents(v.bill)}`}
              </Pill>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableApp({
  state,
  mesa,
  onLeave,
}: {
  state: DemoState;
  mesa: number;
  onLeave: () => void;
}) {
  const { run } = useDemo();
  const view = tableView(state, mesa);
  const [step, setStep] = useState<Step>("app");
  const [tab, setTab] = useState<Tab>(view.lines.length ? "conta" : "cardapio");
  const [name, setName] = useState(() => {
    try {
      return window.localStorage.getItem("tipe-demo-nome") ?? "";
    } catch {
      return "";
    }
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartKey, setCartKey] = useState(newKey);
  const [mode, setMode] = useState<PayMode>({ kind: "rest" });
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payment = paymentId ? (state.payments.find((p) => p.id === paymentId) ?? null) : null;

  // O pagamento no local é confirmado pelo garçom em outra aba.
  useEffect(() => {
    if (step === "processando" && payment?.status === "aprovado") setStep("pronto");
    if (step === "processando" && payment?.status === "falhou") {
      setError("O pagamento não foi concluído. Os itens voltaram para a conta.");
      setStep("app");
      setTab("conta");
    }
  }, [step, payment?.status]);

  async function sendOrder() {
    setError(null);
    const r = await run({
      type: "placeOrder",
      actor: "cliente",
      table: mesa,
      source: "qr",
      items: cart,
      idempotencyKey: cartKey,
      guests: Math.max(view.table.guests, 2),
      at: Date.now(),
    });
    if (!r.ok) return setError(r.error);
    setCart([]);
    setCartKey(newKey());
    setTab("pedidos");
  }

  return (
    <div className="customer-theme">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            // Sair no meio do pagamento libera os itens reservados para o resto da mesa.
            if (
              step === "processando" &&
              payment?.status === "pendente" &&
              payment.method !== "estabelecimento"
            )
              await run({ type: "abandonPayment", paymentId: payment.id });
            if (step === "app") onLeave();
            else setStep("app");
          }}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface shadow-xs"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{state.restaurant.name}</p>
          <p className="font-display text-lg font-semibold leading-tight">Mesa {mesa}</p>
        </div>
        <Pill tone="brand">Atendimento: {view.waiter.name.split(" ")[0]}</Pill>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {step === "app" && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="tablist">
            {(["cardapio", "pedidos", "conta"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full py-2 text-sm font-semibold transition",
                  tab === t ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground",
                )}
              >
                {t === "cardapio" ? "Cardápio" : t === "pedidos" ? "Pedidos" : "Conta"}
              </button>
            ))}
          </div>
          {tab === "cardapio" && (
            <Menu
              state={state}
              cart={cart}
              setCart={setCart}
              onSend={sendOrder}
              seats={Math.max(view.table.seats, view.table.guests)}
            />
          )}
          {tab === "pedidos" && <Orders state={state} mesa={mesa} />}
          {tab === "conta" && (
            <Bill
              state={state}
              mesa={mesa}
              mode={mode}
              setMode={setMode}
              onPay={() => {
                setError(null);
                setStep("checkout");
              }}
              onMenu={() => setTab("cardapio")}
            />
          )}
        </>
      )}

      {step === "checkout" && (
        <Checkout
          state={state}
          mesa={mesa}
          mode={mode}
          name={name}
          setName={setName}
          onPaid={async (method, tipPercent, tipCents) => {
            setError(null);
            try {
              window.localStorage.setItem("tipe-demo-nome", name);
            } catch {
              /* sem armazenamento */
            }
            const r = await run({
              type: "startPayment",
              actor: "cliente",
              table: mesa,
              payer: name,
              method,
              mode,
              ...(tipCents !== undefined ? { tipCents } : { tipPercent }),
              idempotencyKey: newKey(),
              at: Date.now(),
            });
            if (!r.ok) {
              setError(r.error);
              setStep("app");
              setTab("conta");
              return;
            }
            setPaymentId(r.id ?? null);
            setStep("processando");
          }}
        />
      )}

      {step === "processando" && payment && (
        <Processing
          state={state}
          paymentId={payment.id}
          onCancel={async () => {
            await run({ type: "abandonPayment", paymentId: payment.id });
          }}
        />
      )}
      {step === "pronto" && payment && (
        <Done
          state={state}
          paymentId={payment.id}
          onBack={() => {
            setPaymentId(null);
            setMode({ kind: "rest" });
            setStep("app");
            setTab("conta");
          }}
        />
      )}
    </div>
  );
}

function Menu({
  state,
  cart,
  setCart,
  onSend,
  seats,
}: {
  state: DemoState;
  cart: CartItem[];
  setCart: (c: CartItem[]) => void;
  onSend: () => void;
  seats: number;
}) {
  const categories = [...new Set(state.menu.map((m) => m.category))];
  const [open, setOpen] = useState<string | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [seat, setSeat] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const total = cart.reduce((s, c) => {
    const m = state.menu.find((x) => x.id === c.menuId)!;
    return (
      s +
      c.qty *
        (m.priceCents +
          (c.addons ?? []).reduce(
            (a, id) => a + (m.addons.find((x) => x.id === id)?.priceCents ?? 0),
            0,
          ))
    );
  }, 0);
  const last = cart.at(-1);
  const suggestion = last
    ? state.menu.find(
        (m) =>
          m.id === state.menu.find((x) => x.id === last.menuId)?.pairsWith &&
          m.available &&
          !cart.some((c) => c.menuId === m.id),
      )
    : undefined;

  function add(menuId: string) {
    setCart([...cart, { menuId, qty: 1, addons, ...(seat ? { seat } : {}), notes }]);
    setOpen(null);
    setAddons([]);
    setSeat(undefined);
    setNotes("");
  }

  return (
    <div className="pb-24">
      {categories.map((cat) => (
        <section key={cat} className="mb-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {cat}
          </h2>
          <div className="surface-card divide-y divide-border">
            {state.menu
              .filter((m) => m.category === cat)
              .map((m) => (
                <div key={m.id} className="p-4">
                  <button
                    type="button"
                    disabled={!m.available}
                    onClick={() => setOpen(open === m.id ? null : m.id)}
                    className="flex w-full items-start gap-3 text-left disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.name}</p>
                      {m.description && (
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                      )}
                      {m.allergens.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Contém: {m.allergens.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="money font-semibold">
                      {m.available ? brlCents(m.priceCents) : "Esgotado"}
                    </span>
                  </button>
                  {open === m.id && (
                    <div className="mt-3 space-y-3 rounded-xl bg-background-muted p-3">
                      {m.addons.map((a) => (
                        <label key={a.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={addons.includes(a.id)}
                            onChange={(e) =>
                              setAddons(
                                e.target.checked
                                  ? [...addons, a.id]
                                  : addons.filter((x) => x !== a.id),
                              )
                            }
                          />
                          {a.name}{" "}
                          <span className="ml-auto text-muted-foreground">
                            + {brlCents(a.priceCents)}
                          </span>
                        </label>
                      ))}
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">
                          Para quem? (ajuda a dividir por lugar)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: seats }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setSeat(seat === n ? undefined : n)}
                              className={cn(
                                "rounded-full px-3 py-1 text-sm",
                                seat === n ? "bg-ink text-white" : "bg-surface",
                              )}
                            >
                              Lugar {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={140}
                        placeholder="Observação (ex.: sem cebola)"
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                      />
                      <Button className="w-full" onClick={() => add(m.id)}>
                        <Plus /> Adicionar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-md space-y-2">
            {suggestion && (
              <button
                type="button"
                onClick={() => setCart([...cart, { menuId: suggestion.id, qty: 1 }])}
                className="flex w-full items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-left text-sm text-brand-strong"
              >
                <Sparkles className="h-4 w-4" aria-hidden /> Combina bem: {suggestion.name}{" "}
                <span className="ml-auto font-semibold">+ {brlCents(suggestion.priceCents)}</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCart([])}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground"
              >
                Limpar
              </button>
              <Button className="h-12 flex-1" onClick={onSend}>
                <ShoppingBag /> Enviar {cart.length} {cart.length === 1 ? "item" : "itens"} ·{" "}
                {brlCents(total)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Orders({ state, mesa }: { state: DemoState; mesa: number }) {
  const lines = tableView(state, mesa).lines;
  if (!lines.length)
    return (
      <p className="surface-card p-6 text-center text-sm text-muted-foreground">
        Nenhum pedido ainda. O que você pedir aqui ou ao garçom aparece nesta lista.
      </p>
    );
  return (
    <div className="surface-card divide-y divide-border">
      {lines.map((l) => (
        <div key={l.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {l.qty}× {l.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.orders.find((o) => o.id === l.orderId)?.source === "qr"
                ? "Pedido pelo celular"
                : "Pedido ao garçom"}
              {l.seat ? ` · lugar ${l.seat}` : ""}
              {l.notes ? ` · ${l.notes}` : ""}
            </p>
          </div>
          <Pill tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Pill>
        </div>
      ))}
    </div>
  );
}

function Bill({
  state,
  mesa,
  mode,
  setMode,
  onPay,
  onMenu,
}: {
  state: DemoState;
  mesa: number;
  mode: PayMode;
  setMode: (m: PayMode) => void;
  onPay: () => void;
  onMenu: () => void;
}) {
  const v = tableView(state, mesa);
  const rate = state.restaurant.serviceRate;
  const [split, setSplit] = useState<"tudo" | "iguais" | "itens" | "lugar" | "valor">("tudo");
  const [people, setPeople] = useState(2);
  const [amount, setAmount] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const seats = [
    ...new Set(v.lines.map((l) => l.seat).filter((x): x is number => x !== null)),
  ].sort();

  useEffect(() => {
    if (split === "tudo") setMode({ kind: "rest" });
    if (split === "iguais") setMode({ kind: "equal", parts: 1, people });
    if (split === "itens") setMode({ kind: "items", portions: picked });
    if (split === "valor")
      setMode({ kind: "amount", value: Number(amount.replace(",", ".")) || 0 });
    if (split === "lugar" && mode.kind !== "seat" && seats[0])
      setMode({ kind: "seat", seat: seats[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, people, amount, picked]);

  if (!v.lines.length)
    return (
      <div className="surface-card p-6 text-center">
        <Receipt className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="mt-2 font-semibold">A conta ainda está vazia</p>
        <Button className="mt-4" variant="outline" onClick={onMenu}>
          Ver cardápio
        </Button>
      </div>
    );

  // Valor livre já inclui a taxa de serviço: o motor recebe só o subtotal.
  const effective: PayMode =
    mode.kind === "amount" ? { kind: "amount", value: mode.value / (1 + rate) } : mode;
  const preview = previewCents(state, mesa, effective);
  const paidBy = v.payments.filter((p) => p.status === "aprovado");
  const remainingWithFee = Math.round(v.remaining * (1 + rate));
  const items = shareItems(state, mesa);

  return (
    <div className="space-y-4 pb-6">
      <div className="surface-card p-5">
        <p className="text-sm text-muted-foreground">Falta pagar</p>
        <p className="money font-display text-4xl font-semibold tracking-display">
          {brlCents(remainingWithFee)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Conta {brlCents(v.bill)} + serviço {Math.round(rate * 100)}%{" "}
          {paidBy.length
            ? `· já pago ${brlCents(paidBy.reduce((s, p) => s + p.subtotalCents + p.serviceCents, 0))}`
            : ""}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${v.bill ? 100 - (v.remaining / v.bill) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="surface-card divide-y divide-border">
        {v.lines.map((l) => {
          const it = items.find((i) => i.code === l.id);
          const free = it?.available ?? 0;
          return (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              {split === "itens" && free > 0 ? (
                <Stepper
                  value={picked[l.id] ?? 0}
                  max={free}
                  onChange={(q) => setPicked({ ...picked, [l.id]: q })}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className={cn(free === 0 && "text-muted-foreground line-through")}>
                  {l.qty}× {l.name}
                </p>
                {l.seat && <p className="text-[11px] text-muted-foreground">Lugar {l.seat}</p>}
              </div>
              <span className="money">{brlCents(l.unitCents * l.qty)}</span>
            </div>
          );
        })}
      </div>

      {paidBy.length > 0 && (
        <div className="surface-card p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quem já pagou
          </p>
          {paidBy.map((p) => (
            <p key={p.id} className="flex justify-between text-sm">
              <span>
                {p.payer} · {METHOD_LABEL[p.method]}
              </span>
              <span className="money">{brlCents(p.subtotalCents + p.serviceCents)}</span>
            </p>
          ))}
        </div>
      )}

      {v.remaining > 0 ? (
        <div className="surface-card p-4">
          <p className="mb-2 text-sm font-semibold">Como você quer pagar?</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["tudo", "Tudo"],
                ["iguais", "Partes iguais"],
                ["itens", "Meus itens"],
                ...(seats.length ? [["lugar", "Por lugar"]] : []),
                ["valor", "Outro valor"],
              ] as [typeof split, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSplit(k)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  split === k ? "bg-ink text-white" : "bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {split === "iguais" && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Users className="h-4 w-4" aria-hidden /> Dividir entre{" "}
              <Stepper value={people} min={2} max={12} onChange={setPeople} /> pessoas
            </div>
          )}
          {split === "lugar" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {seats.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMode({ kind: "seat", seat: n })}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm",
                    mode.kind === "seat" && mode.seat === n ? "bg-brand text-ink" : "bg-muted",
                  )}
                >
                  Lugar {n}
                </button>
              ))}
            </div>
          )}
          {split === "valor" && (
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor com serviço, ex.: 50,00"
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2"
            />
          )}
          <Button className="mt-4 h-12 w-full text-base" disabled={!preview} onClick={onPay}>
            {preview ? (
              <>
                Pagar {brlCents(preview.subtotal + preview.service)} <ChevronRight />
              </>
            ) : (
              "Escolha o que pagar"
            )}
          </Button>
        </div>
      ) : (
        <p className="surface-card p-5 text-center text-sm">
          {v.pending.length ? "Aguardando a confirmação de um pagamento." : "Tudo pago. Obrigado!"}
        </p>
      )}
    </div>
  );
}

const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(2).replace(".", ","));

function Stepper({
  value,
  onChange,
  min = 0,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
}) {
  const step = max < 1 ? max : 1;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted p-0.5">
      <button
        type="button"
        aria-label="Menos"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 10_000) / 10_000))}
        className="grid h-7 w-7 place-items-center rounded-full bg-surface"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="money w-7 text-center text-sm font-semibold">{fmtQty(value)}</span>
      <button
        type="button"
        aria-label="Mais"
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 10_000) / 10_000))}
        className="grid h-7 w-7 place-items-center rounded-full bg-surface"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function Checkout({
  state,
  mesa,
  mode,
  name,
  setName,
  onPaid,
}: {
  state: DemoState;
  mesa: number;
  mode: PayMode;
  name: string;
  setName: (s: string) => void;
  onPaid: (m: Method, tipPercent: number, tipCents?: number) => void;
}) {
  const rate = state.restaurant.serviceRate;
  const effective: PayMode =
    mode.kind === "amount" ? { kind: "amount", value: mode.value / (1 + rate) } : mode;
  const preview = previewCents(state, mesa, effective);
  // 5% vem sugerida (marcada); "Não" tem o mesmo peso visual.
  const [tip, setTip] = useState<number | "outro">(5);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<Method>("pix");
  const [busy, setBusy] = useState(false);
  const waiter = tableView(state, mesa).waiter.name.split(" ")[0];
  const tipCents = useMemo(
    () =>
      tip === "outro"
        ? Math.round((Number(custom.replace(",", ".")) || 0) * 100)
        : Math.round(((preview?.subtotal ?? 0) * tip) / 100),
    [custom, tip, preview?.subtotal],
  );
  if (!preview)
    return (
      <p className="surface-card p-6 text-center text-sm">
        Essa parte da conta acabou de ser paga por outra pessoa. Volte e escolha de novo.
      </p>
    );
  const total = preview.subtotal + preview.service + tipCents;
  const maxTip = preview.subtotal + preview.service;
  const tipError =
    tip !== "outro" || !custom
      ? null
      : tipCents < TIP_MIN_CENTS
        ? `Mínimo de ${brlCents(TIP_MIN_CENTS)}`
        : tipCents > maxTip
          ? `Máximo de ${brlCents(maxTip)} (o valor que você está pagando)`
          : null;

  return (
    <div className="space-y-4 pb-6">
      <div className="surface-card p-4">
        <label className="text-sm font-semibold" htmlFor="demo-nome">
          Seu nome
        </label>
        <input
          id="demo-nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Para a mesa saber quem pagou"
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
        />
      </div>
      <div className="surface-card p-4">
        <p className="text-sm font-semibold">
          Gorjeta para {waiter}{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {([0, ...TIP_PERCENTS, "outro"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tip === t}
              onClick={() => setTip(t)}
              className={cn(
                "flex flex-col items-center rounded-xl py-2 text-sm font-semibold leading-tight",
                tip === t ? "bg-ink text-white" : "bg-muted",
              )}
            >
              {t === 0 ? "Não" : t === "outro" ? "Outro" : `${t}%`}
              {typeof t === "number" && t > 0 && (
                <span className="text-[10px] font-normal opacity-75">
                  {brlCents(Math.round((preview.subtotal * t) / 100))}
                </span>
              )}
            </button>
          ))}
        </div>
        {tip === "outro" && (
          <div className="mt-2">
            <input
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={`De ${brlCents(TIP_MIN_CENTS)} até ${brlCents(maxTip)}`}
              aria-label="Outro valor de gorjeta"
              aria-invalid={tipError ? true : undefined}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            />
            {tipError && <p className="mt-1 text-xs text-destructive">{tipError}</p>}
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Gorjeta extra, além da taxa de serviço. Regra configurada:{" "}
          {Math.round(state.restaurant.tipShareWaiter * 100)}% para quem atendeu.
        </p>
      </div>
      <div className="surface-card p-4">
        <p className="mb-2 text-sm font-semibold">Forma de pagamento</p>
        <div className="space-y-1.5">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium",
                method === m ? "border-brand bg-brand-soft" : "border-border",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full border",
                  method === m ? "border-brand bg-brand text-ink" : "border-border",
                )}
              >
                {method === m && <Check className="h-3 w-3" />}
              </span>
              {METHOD_LABEL[m]}
              {m === "estabelecimento" && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  dinheiro ou maquininha
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="surface-card space-y-1 p-4 text-sm">
        <Row label="Sua parte" cents={preview.subtotal} />
        <Row label={`Serviço (${Math.round(rate * 100)}%)`} cents={preview.service} />
        {tipCents > 0 && <Row label="Gorjeta" cents={tipCents} />}
        <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-semibold">
          <span>Total</span>
          <span className="money">{brlCents(total)}</span>
        </div>
      </div>
      <Button
        className="h-14 w-full text-base"
        disabled={
          busy ||
          !name.trim() ||
          !!tipError ||
          (tip === "outro" && tipCents > 0 && tipCents < TIP_MIN_CENTS)
        }
        onClick={async () => {
          setBusy(true);
          await onPaid(method, tip === "outro" ? 0 : tip, tip === "outro" ? tipCents : undefined);
          setBusy(false);
        }}
      >
        {method === "estabelecimento"
          ? "Chamar para pagar no local"
          : `Pagar ${brlCents(total)} com ${METHOD_LABEL[method]}`}
      </Button>
      {!name.trim() && (
        <p className="text-center text-xs text-muted-foreground">
          Informe seu nome para continuar.
        </p>
      )}
    </div>
  );
}

const Row = ({ label, cents }: { label: string; cents: number }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="money">{brlCents(cents)}</span>
  </div>
);

function Processing({
  state,
  paymentId,
  onCancel,
}: {
  state: DemoState;
  paymentId: string;
  onCancel: () => void;
}) {
  const { run } = useDemo();
  const p = state.payments.find((x) => x.id === paymentId)!;
  const confirm = () =>
    run({
      type: "providerEvent",
      eventId: `evt-${p.id}`,
      providerRef: p.providerRef!,
      status: "paid",
      amountCents: totalCents(p),
      at: Date.now(),
    });
  return (
    <div className="surface-card p-6 text-center">
      {p.method === "estabelecimento" ? (
        <>
          <p className="font-display text-xl font-semibold">{p.payer}, o garçom foi avisado</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pague {brlCents(totalCents(p))} em dinheiro ou na maquininha. A conta se atualiza quando
            o garçom confirmar (abra o perfil Garçom em outra aba).
          </p>
        </>
      ) : p.method === "pix" ? (
        <>
          <div className="mx-auto grid h-40 w-40 place-items-center rounded-2xl border-2 border-dashed border-border text-xs text-muted-foreground">
            QR Pix de demonstração
            <br />
            (sem valor real)
          </div>
          <p className="mt-3 font-display text-xl font-semibold">{brlCents(totalCents(p))}</p>
          <p className="text-sm text-muted-foreground">
            Na conta real, o Pix é confirmado pelo banco em segundos.
          </p>
          <Button className="mt-4 w-full" onClick={confirm}>
            Simular confirmação do banco
          </Button>
        </>
      ) : (
        <>
          <p className="font-display text-xl font-semibold">{METHOD_LABEL[p.method]}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No celular, a carteira pede Face ID ou digital.
          </p>
          <Button className="mt-4 w-full" onClick={confirm}>
            Simular confirmação ({brlCents(totalCents(p))})
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 text-sm text-muted-foreground underline"
      >
        Desistir e liberar os itens
      </button>
    </div>
  );
}

function Done({
  state,
  paymentId,
  onBack,
}: {
  state: DemoState;
  paymentId: string;
  onBack: () => void;
}) {
  const { run } = useDemo();
  const p = state.payments.find((x) => x.id === paymentId)!;
  const rated = state.ratings.find((r) => r.paymentId === p.id);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const lines = state.lines.filter((l) => p.portions[l.id]);
  return (
    <div className="space-y-4">
      <div className="surface-card p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-[oklch(0.42_0.12_150)]">
          <Check className="h-7 w-7" />
        </span>
        <p className="mt-3 font-display text-2xl font-semibold">Pagamento aprovado</p>
        <p className="text-sm text-muted-foreground">
          {brlCents(totalCents(p))} · {METHOD_LABEL[p.method]}
        </p>
      </div>
      <details className="surface-card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Comprovante (demonstração)</summary>
        <div className="mt-3 space-y-1">
          <p className="text-muted-foreground">
            {state.restaurant.name} · Mesa {p.table} ·{" "}
            {new Date(p.approvedAt ?? p.createdAt).toLocaleString("pt-BR")}
          </p>
          {lines.map((l) => (
            <p key={l.id}>
              {fmtQty(p.portions[l.id] ?? 0)}× {l.name}
            </p>
          ))}
          <Row label="Itens" cents={p.subtotalCents} />
          <Row label="Serviço" cents={p.serviceCents} />
          <Row label="Gorjeta" cents={p.tipCents} />
          <p className="pt-2 text-[11px] text-muted-foreground">
            Documento sem valor fiscal. Nota fiscal depende da integração com o PDV do restaurante.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.print()}>
            Imprimir ou salvar PDF
          </Button>
        </div>
      </details>
      <div className="surface-card p-5">
        {rated ? (
          <p className="text-center text-sm">
            Obrigado pela avaliação de {rated.stars} {rated.stars === 1 ? "estrela" : "estrelas"}.
          </p>
        ) : (
          <>
            <p className="text-center font-semibold">Como foi o atendimento?</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrelas`}
                  onClick={() => setStars(n)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      n <= stars ? "fill-warning text-warning" : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              placeholder="Quer contar algo? (opcional)"
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            />
            <Button
              className="mt-2 w-full"
              disabled={!stars}
              onClick={() =>
                run({
                  type: "rate",
                  table: p.table,
                  paymentId: p.id,
                  stars,
                  comment,
                  at: Date.now(),
                })
              }
            >
              Enviar avaliação
            </Button>
          </>
        )}
      </div>
      <Button variant="outline" className="w-full" onClick={onBack}>
        Voltar para a conta
      </Button>
    </div>
  );
}
