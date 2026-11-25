import {
  ArrowLeft,
  Check,
  ChevronRight,
  HandCoins,
  Minus,
  Plus,
  Printer,
  QrCode,
  Smartphone,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  brlCents,
  METHOD_LABEL,
  previewCents,
  shareItems,
  TIP_MIN_CENTS,
  tipOptions,
  tableView,
  totalCents,
  type CartItem,
  type DemoState,
  type Method,
  type PayMode,
} from "@/lib/tipe/demo/engine";
import { useDemo } from "@/lib/tipe/demo/store";
import { cn } from "@/lib/utils";
import { newKey } from "./DemoShell";
import { Avatar, Dot, PrimaryButton, Segmented, Sheet, type DotTone } from "./ui";

type Step = "app" | "pagar" | "processando" | "pronto";
type Tab = "cardapio" | "pedidos" | "conta";

const STATUS_LABEL = {
  novo: "Recebido",
  preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Servido",
  cancelado: "Cancelado",
} as const;
const STATUS_STEP = { novo: 1, preparo: 2, pronto: 3, entregue: 4, cancelado: 0 } as const;
const METHODS: Method[] = ["pix", "apple_pay", "google_pay", "estabelecimento"];
const METHOD_HINT: Record<Method, string> = {
  pix: "Aprovado pelo banco na hora",
  apple_pay: "Face ID ou digital",
  google_pay: "Desbloqueio do celular",
  estabelecimento: "Dinheiro ou maquininha com o garçom",
};
const METHOD_ICON: Record<Method, typeof QrCode> = {
  pix: QrCode,
  apple_pay: Smartphone,
  google_pay: Wallet,
  estabelecimento: HandCoins,
};

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
  return (
    <div className="customer-theme mx-auto w-full max-w-[420px]">
      {mesa === null || !state.tables.some((t) => t.number === mesa) ? (
        <QrPicker state={state} onPick={onMesa} />
      ) : (
        <TableApp key={mesa} state={state} mesa={mesa} onLeave={() => onMesa(null)} />
      )}
    </div>
  );
}

function QrPicker({ state, onPick }: { state: DemoState; onPick: (n: number) => void }) {
  return (
    <div className="demo-step">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-white">
          <QrCode className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-heading">
            Aponte para o QR da mesa
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Aqui, toque numa mesa do {state.restaurant.name}.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {state.tables.map((t) => {
          const v = tableView(state, t.number);
          const tone: DotTone =
            v.state === "livre" ? "neutral" : v.state === "quitada" ? "success" : "brand";
          return (
            <button
              key={t.number}
              type="button"
              onClick={() => onPick(t.number)}
              className="group rounded-2xl border border-border/70 bg-surface p-4 text-left transition hover:border-ink/20 hover:shadow-[0_6px_20px_-12px_oklch(0.2_0.04_250/0.35)]"
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-[17px] font-semibold">Mesa {t.number}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Dot tone={tone} />
                {v.state === "livre"
                  ? "Livre"
                  : v.state === "quitada"
                    ? "Conta paga"
                    : `Conta de ${brlCents(Math.round(v.bill * (1 + state.restaurant.serviceRate)))}`}
              </span>
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
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payment = paymentId ? (state.payments.find((p) => p.id === paymentId) ?? null) : null;
  const rate = state.restaurant.serviceRate;
  const waiterFirst = view.waiter.name.split(" ")[0]!;

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

  async function back() {
    // Sair no meio do pagamento libera os itens reservados para o resto da mesa.
    if (
      step === "processando" &&
      payment?.status === "pendente" &&
      payment.method !== "estabelecimento"
    )
      await run({ type: "abandonPayment", paymentId: payment.id });
    if (step === "app") onLeave();
    else setStep("app");
  }

  const remainingWithFee = Math.round(view.remaining * (1 + rate));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-surface text-foreground transition hover:bg-[oklch(0.96_0.004_250)]"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold leading-tight">
            {state.restaurant.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Mesa {mesa} · {waiterFirst} atende você
          </p>
        </div>
        <Avatar name={state.restaurant.name} className="h-9 w-9" />
      </div>

      {error && (
        <p
          role="alert"
          className="demo-fade mb-3 rounded-2xl bg-destructive/8 px-4 py-3 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}

      {step === "app" && (
        <>
          <Segmented<Tab>
            className="mb-4 w-full"
            value={tab}
            onChange={setTab}
            options={[
              { id: "cardapio", label: "Cardápio" },
              {
                id: "pedidos",
                label: "Pedidos",
                badge: view.lines.some((l) => l.status === "pronto") ? (
                  <Dot tone="brand" className="h-2 w-2" />
                ) : undefined,
              },
              { id: "conta", label: "Conta" },
            ]}
          />
          {tab === "cardapio" && (
            <Menu
              state={state}
              cart={cart}
              setCart={setCart}
              onSend={sendOrder}
              seats={Math.max(view.table.seats, view.table.guests)}
            />
          )}
          {tab === "pedidos" && (
            <Orders state={state} mesa={mesa} onMenu={() => setTab("cardapio")} />
          )}
          {tab === "conta" && (
            <Bill
              state={state}
              mesa={mesa}
              onPay={() => {
                setError(null);
                setStep("pagar");
              }}
              onMenu={() => setTab("cardapio")}
              remainingWithFee={remainingWithFee}
            />
          )}
        </>
      )}

      {step === "pagar" && (
        <PayFlow
          state={state}
          mesa={mesa}
          name={name}
          setName={setName}
          onPaid={async (mode, method, tip) => {
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
              ...tip,
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
            setStep("app");
            setTab("conta");
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- cardápio

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
  const [cat, setCat] = useState(categories[0]!);
  const [open, setOpen] = useState<string | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [seat, setSeat] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const item = state.menu.find((m) => m.id === open);
  const priceOf = (c: CartItem) => {
    const m = state.menu.find((x) => x.id === c.menuId)!;
    return (
      c.qty *
      (m.priceCents +
        (c.addons ?? []).reduce(
          (a, id) => a + (m.addons.find((x) => x.id === id)?.priceCents ?? 0),
          0,
        ))
    );
  };
  const total = cart.reduce((s, c) => s + priceOf(c), 0);
  const last = cart.at(-1);
  const suggestion = last
    ? state.menu.find(
        (m) =>
          m.id === state.menu.find((x) => x.id === last.menuId)?.pairsWith &&
          m.available &&
          !cart.some((c) => c.menuId === m.id),
      )
    : undefined;

  function close() {
    setOpen(null);
    setAddons([]);
    setSeat(undefined);
    setNotes("");
  }
  function add(menuId: string) {
    setCart([...cart, { menuId, qty: 1, addons, ...(seat ? { seat } : {}), notes }]);
    close();
  }
  const itemPrice = item
    ? item.priceCents +
      addons.reduce((a, id) => a + (item.addons.find((x) => x.id === id)?.priceCents ?? 0), 0)
    : 0;

  return (
    <div className={cn(cart.length > 0 && "pb-36")}>
      <div className="demo-scroll -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCat(c);
              document
                .getElementById(`cat-${c}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
              cat === c
                ? "bg-ink text-white"
                : "border border-border/70 bg-surface text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {categories.map((c) => (
        <section key={c} id={`cat-${c}`} className="mb-5 scroll-mt-32">
          <h2 className="mb-1 px-1 font-display text-[15px] font-semibold">{c}</h2>
          <div className="divide-y divide-border/70">
            {state.menu
              .filter((m) => m.category === c)
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!m.available}
                  onClick={() => setOpen(m.id)}
                  className="flex w-full items-start gap-3 px-1 py-3.5 text-left disabled:opacity-45"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-snug">{m.name}</p>
                    {m.description && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                        {m.description}
                      </p>
                    )}
                    <p className="money mt-1.5 text-[13px] font-semibold">
                      {m.available ? brlCents(m.priceCents) : "Esgotado agora"}
                    </p>
                  </div>
                  {m.available && (
                    <span
                      className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-foreground"
                      aria-hidden
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  )}
                </button>
              ))}
          </div>
        </section>
      ))}

      <Sheet
        open={!!item}
        onClose={close}
        title={
          item && (
            <>
              <p className="font-display text-lg font-semibold leading-tight">{item.name}</p>
              {item.description && (
                <p className="mt-1 text-[13px] text-muted-foreground">{item.description}</p>
              )}
              {item.allergens.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Contém {item.allergens.join(", ")}
                </p>
              )}
            </>
          )
        }
        footer={
          item && (
            <PrimaryButton onClick={() => add(item.id)}>
              Adicionar · <span className="money">{brlCents(itemPrice)}</span>
            </PrimaryButton>
          )
        }
      >
        {item && (
          <div className="space-y-5 pt-2">
            {item.addons.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-muted-foreground">
                  Adicionais
                </legend>
                <div className="divide-y divide-border/70 rounded-2xl border border-border/70">
                  {item.addons.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[oklch(0.2_0.04_250)]"
                        checked={addons.includes(a.id)}
                        onChange={(e) =>
                          setAddons(
                            e.target.checked ? [...addons, a.id] : addons.filter((x) => x !== a.id),
                          )
                        }
                      />
                      {a.name}
                      <span className="money ml-auto text-muted-foreground">
                        + {brlCents(a.priceCents)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Para quem é? <span className="font-normal">Ajuda a dividir por lugar</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: seats }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={seat === n}
                    onClick={() => setSeat(seat === n ? undefined : n)}
                    className={cn(
                      "h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
                      seat === n ? "bg-ink text-white" : "border border-border bg-surface",
                    )}
                  >
                    Lugar {n}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                Observação
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={140}
                placeholder="Ex.: sem cebola"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-ink/40"
              />
            </label>
          </div>
        )}
      </Sheet>

      {cart.length > 0 && !item && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="demo-sheet mx-auto max-w-[420px] space-y-2">
            {suggestion && (
              <button
                type="button"
                onClick={() => setCart([...cart, { menuId: suggestion.id, qty: 1 }])}
                className="flex w-full items-center gap-2 rounded-2xl border border-border/70 bg-surface/95 px-3.5 py-2.5 text-left text-[13px] shadow-[0_8px_24px_-12px_oklch(0.2_0.04_250/0.3)] backdrop-blur"
              >
                <Sparkles className="h-4 w-4 text-brand-strong" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  Combina bem: <b className="font-semibold">{suggestion.name}</b>
                </span>
                <span className="money shrink-0 font-semibold">
                  + {brlCents(suggestion.priceCents)}
                </span>
              </button>
            )}
            <div className="flex items-center gap-2 rounded-full bg-ink p-1.5 pl-4 text-white shadow-[0_12px_32px_-12px_oklch(0.2_0.04_250/0.6)]">
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[13px] text-white/60 hover:text-white"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={onSend}
                className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-semibold text-ink"
              >
                Enviar {cart.length} {cart.length === 1 ? "item" : "itens"} ·{" "}
                <span className="money">{brlCents(total)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- pedidos

function Orders({ state, mesa, onMenu }: { state: DemoState; mesa: number; onMenu: () => void }) {
  const lines = tableView(state, mesa).lines;
  if (!lines.length)
    return (
      <EmptyNote
        text="O que você pedir aqui ou ao garçom aparece nesta lista, com o andamento da cozinha."
        action="Ver cardápio"
        onAction={onMenu}
      />
    );
  return (
    <ul className="space-y-2">
      {lines.map((l) => {
        const step = STATUS_STEP[l.status];
        return (
          <li key={l.id} className="rounded-2xl border border-border/70 bg-surface px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug">
                  {l.qty}× {l.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {state.orders.find((o) => o.id === l.orderId)?.source === "qr"
                    ? "Pedido pelo celular"
                    : "Pedido ao garçom"}
                  {l.seat ? ` · lugar ${l.seat}` : ""}
                  {l.notes ? ` · ${l.notes}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  l.status === "pronto"
                    ? "text-brand-strong"
                    : l.status === "cancelado"
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {STATUS_LABEL[l.status]}
              </span>
            </div>
            {l.status !== "cancelado" && (
              <div className="mt-3 grid grid-cols-4 gap-1" aria-hidden>
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-colors duration-500",
                      i <= step
                        ? step === 4
                          ? "bg-success"
                          : "bg-brand"
                        : "bg-[oklch(0.93_0.006_250)]",
                    )}
                  />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- conta

function Bill({
  state,
  mesa,
  onPay,
  onMenu,
  remainingWithFee,
}: {
  state: DemoState;
  mesa: number;
  onPay: () => void;
  onMenu: () => void;
  remainingWithFee: number;
}) {
  const v = tableView(state, mesa);
  const rate = state.restaurant.serviceRate;
  const items = shareItems(state, mesa);

  if (!v.lines.length)
    return (
      <EmptyNote
        text="A conta ainda está vazia. Peça pelo cardápio ou chame o garçom."
        action="Ver cardápio"
        onAction={onMenu}
      />
    );

  const totalWithFee = Math.round(v.bill * (1 + rate));
  const paid = v.payments.filter((p) => p.status === "aprovado");
  const paidShare = v.bill ? 1 - v.remaining / v.bill : 0;
  const bySeat = [...new Set(v.lines.map((l) => l.seat))].sort((a, b) => (a ?? 99) - (b ?? 99));
  const grouped = bySeat.length > 1;

  return (
    <div className="pb-24">
      <div className="relative overflow-hidden rounded-[24px] bg-ink p-5 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand/25 blur-3xl"
        />
        <p className="text-xs text-white/60">Falta pagar</p>
        <p className="money mt-1 font-display text-[34px] font-semibold leading-none tracking-display">
          {brlCents(remainingWithFee)}
        </p>
        <p className="mt-2 text-xs text-white/60">
          de <span className="money">{brlCents(totalWithFee)}</span> · serviço de{" "}
          {Math.round(rate * 100)}% incluso
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
            style={{ width: `${paidShare * 100}%` }}
          />
        </div>
        {paid.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {paid.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-[13px]">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-ink">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate text-white/85">
                  {p.payer} pagou · {METHOD_LABEL[p.method]}
                </span>
                <span className="money text-white/85">
                  {brlCents(p.subtotalCents + p.serviceCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-1 flex items-baseline justify-between px-1">
          <h2 className="font-display text-[15px] font-semibold">Itens da mesa</h2>
          <span className="text-xs text-muted-foreground">{v.lines.length} itens</span>
        </div>
        {bySeat.map((seat) => (
          <div key={seat ?? "mesa"}>
            {grouped && (
              <p className="mt-3 px-1 text-[11px] font-semibold text-muted-foreground">
                {seat ? `Lugar ${seat}` : "Para a mesa"}
              </p>
            )}
            <ul className="divide-y divide-border/70">
              {v.lines
                .filter((l) => l.seat === seat)
                .map((l) => {
                  const free = items.find((i) => i.code === l.id)?.available ?? 0;
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-1 py-3 text-[14px]">
                      <span className={cn("min-w-0 flex-1", free === 0 && "text-muted-foreground")}>
                        {l.qty}× {l.name}
                      </span>
                      {free === 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-strong">
                          <Check className="h-3 w-3" /> pago
                        </span>
                      )}
                      <span
                        className={cn("money", free === 0 && "text-muted-foreground line-through")}
                      >
                        {brlCents(l.unitCents * l.qty)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
        <div className="mt-1 space-y-1 border-t border-border/70 px-1 pt-3 text-[13px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Itens</span>
            <span className="money">{brlCents(v.bill)}</span>
          </div>
          <div className="flex justify-between">
            <span>Serviço ({Math.round(rate * 100)}%)</span>
            <span className="money">{brlCents(totalWithFee - v.bill)}</span>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-[420px]">
          {v.remaining > 0 ? (
            <PrimaryButton onClick={onPay}>
              Pagar a conta <ChevronRight className="h-4 w-4" />
            </PrimaryButton>
          ) : (
            <p className="py-3 text-center text-sm font-medium">
              {v.pending.length
                ? "Aguardando a confirmação de um pagamento."
                : "Tudo pago. Obrigado pela visita!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pagamento (dividir → gorjeta → pagar)

// Decisão 11/11: a conta só se divide por itens (ou o lugar, que é um conjunto de itens).
type Split = "tudo" | "itens" | "lugar";
type PayStep = 0 | 1 | 2;
type TipChoice = Record<string, never> | { tipPercent: number } | { tipCents: number };

function PayFlow({
  state,
  mesa,
  name,
  setName,
  onPaid,
}: {
  state: DemoState;
  mesa: number;
  name: string;
  setName: (s: string) => void;
  onPaid: (mode: PayMode, method: Method, tip: TipChoice) => void;
}) {
  const v = tableView(state, mesa);
  const rate = state.restaurant.serviceRate;
  const waiter = v.waiter.name.split(" ")[0]!;
  const [step, setStep] = useState<PayStep>(0);
  const [split, setSplit] = useState<Split>("tudo");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const seats = [
    ...new Set(v.lines.map((l) => l.seat).filter((x): x is number => x !== null)),
  ].sort();
  const [seat, setSeat] = useState<number | null>(seats[0] ?? null);
  const [tip, setTip] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<Method>("pix");
  const [busy, setBusy] = useState(false);
  const items = shareItems(state, mesa);

  const mode: PayMode =
    split === "itens"
      ? { kind: "items", portions: picked }
      : split === "lugar" && seat
        ? { kind: "seat", seat }
        : { kind: "rest" };
  const preview = previewCents(state, mesa, mode);
  const base = (preview?.subtotal ?? 0) + (preview?.service ?? 0);

  const options = useMemo(() => tipOptions(base), [base]);
  const chosen = options.find((o) => o.label === tip);
  const tipCents = tip === "outro" ? Math.round(parseBrl(custom) * 100) : (chosen?.cents ?? 0);
  const tipError =
    tip !== "outro" || !custom
      ? null
      : tipCents < TIP_MIN_CENTS
        ? `Mínimo de ${brlCents(TIP_MIN_CENTS)}`
        : tipCents > base
          ? `Máximo de ${brlCents(base)} (o valor que você está pagando)`
          : null;
  const tipReady = tip !== null && !tipError && !(tip === "outro" && tipCents < TIP_MIN_CENTS);
  const total = base + tipCents;

  const STEPS = ["Dividir", "Gorjeta", "Pagamento"];
  const splits: { id: Split; title: string; sub: string; show: boolean }[] = [
    { id: "tudo", title: "Pagar tudo", sub: "O que falta da conta", show: true },
    { id: "itens", title: "Escolher meus itens", sub: "Só o que você consumiu", show: true },
    {
      id: "lugar",
      title: "Pagar pelo meu lugar",
      sub: "Itens marcados no seu lugar",
      show: seats.length > 0,
    },
  ];

  return (
    <div className="pb-28">
      <div className="mb-5">
        <div className="grid grid-cols-3 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-ink" : "bg-[oklch(0.92_0.006_250)]",
              )}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as PayStep)}
              className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {STEPS[step - 1]}
            </button>
          ) : (
            <span className="text-muted-foreground">Passo 1 de 3</span>
          )}
          <span className="font-semibold">{STEPS[step]}</span>
        </div>
      </div>

      {!preview && step > 0 ? (
        <p className="rounded-2xl bg-warning/12 px-4 py-4 text-center text-sm">
          Essa parte da conta acabou de ser paga por outra pessoa. Volte e escolha de novo.
        </p>
      ) : null}

      {step === 0 && (
        <div key="s0" className="demo-step">
          <h1 className="font-display text-[22px] font-semibold tracking-heading">
            Como você quer pagar?
          </h1>
          <div className="mt-4 space-y-2" role="radiogroup" aria-label="Como dividir">
            {splits
              .filter((s) => s.show)
              .map((s) => {
                const on = split === s.id;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-2xl border bg-surface transition-colors",
                      on ? "border-ink shadow-[0_0_0_1px_oklch(0.2_0.04_250)]" : "border-border/70",
                    )}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSplit(s.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                          on ? "border-ink" : "border-border",
                        )}
                      >
                        {on && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold leading-tight">
                          {s.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">{s.sub}</span>
                      </span>
                    </button>
                    {on && s.id === "itens" && (
                      <ul className="demo-fade divide-y divide-border/70 border-t border-border/70">
                        {v.lines.map((l) => {
                          const free = items.find((i) => i.code === l.id)?.available ?? 0;
                          return (
                            <li
                              key={l.id}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px]"
                            >
                              <span
                                className={cn(
                                  "min-w-0 flex-1",
                                  free === 0 && "text-muted-foreground line-through",
                                )}
                              >
                                {l.qty}× {l.name}
                                <span className="money block text-[11px] text-muted-foreground">
                                  {brlCents(l.unitCents)} cada
                                </span>
                              </span>
                              {free > 0 ? (
                                <Stepper
                                  value={picked[l.id] ?? 0}
                                  max={free}
                                  onChange={(q) => setPicked({ ...picked, [l.id]: q })}
                                />
                              ) : (
                                <span className="text-[11px] font-semibold text-brand-strong">
                                  pago
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {on && s.id === "lugar" && (
                      <div className="demo-fade flex flex-wrap gap-1.5 border-t border-border/70 px-4 py-3">
                        {seats.map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={seat === n}
                            onClick={() => setSeat(n)}
                            className={cn(
                              "h-8 rounded-full px-3 text-[13px] font-medium",
                              seat === n ? "bg-ink text-white" : "border border-border bg-surface",
                            )}
                          >
                            Lugar {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {step === 1 && preview && (
        <div key="s1" className="demo-step">
          <div className="flex items-center gap-3">
            <Avatar name={v.waiter.name} tone="brand" className="h-12 w-12 text-[15px]" />
            <div>
              <h1 className="font-display text-[22px] font-semibold leading-tight tracking-heading">
                Gorjeta para {waiter}
              </h1>
              <p className="text-[13px] text-muted-foreground">
                Opcional, além do serviço de {Math.round(rate * 100)}%.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {options.map((o) => (
              <TipTile
                key={o.label}
                on={tip === o.label}
                onClick={() => setTip(o.label)}
                badge={o.suggested ? "Sugerida" : undefined}
              >
                <span className="font-display text-[17px] font-semibold">{o.label}</span>
                {o.percent ? (
                  <span className="money text-[11px] opacity-70">{brlCents(o.cents)}</span>
                ) : null}
              </TipTile>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <TipTile on={tip === "outro"} onClick={() => setTip("outro")}>
              <span className="text-[14px] font-semibold">Outro valor</span>
            </TipTile>
            <TipTile on={tip === "sem"} onClick={() => setTip("sem")}>
              <span className="text-[14px] font-semibold">Sem gorjeta</span>
            </TipTile>
          </div>
          {tip === "outro" && (
            <div className="demo-fade mt-3">
              <MoneyInput
                value={custom}
                onChange={setCustom}
                label="Outro valor de gorjeta"
                placeholder={`De ${brlCents(TIP_MIN_CENTS)} até ${brlCents(base)}`}
                error={tipError}
                autoFocus
              />
            </div>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[oklch(0.965_0.005_250)] px-3.5 py-3 text-xs text-muted-foreground">
            <HandCoins className="mt-px h-4 w-4 shrink-0" aria-hidden />
            {Math.round(state.restaurant.tipShareWaiter * 100)}% da gorjeta vai direto para {waiter}
            . Ela é cobrada à parte e não entra na conta do restaurante.
          </p>
        </div>
      )}

      {step === 2 && preview && (
        <div key="s2" className="demo-step space-y-5">
          <h1 className="font-display text-[22px] font-semibold tracking-heading">Pagamento</h1>
          <div className="rounded-2xl border border-border/70 bg-surface px-4 py-3 text-[13px]">
            <Row label="Sua parte" cents={preview.subtotal} />
            <Row label={`Serviço (${Math.round(rate * 100)}%)`} cents={preview.service} />
            {tipCents > 0 && <Row label={`Gorjeta para ${waiter}`} cents={tipCents} />}
            <div className="mt-2 flex items-baseline justify-between border-t border-border/70 pt-2.5">
              <span className="font-semibold">Total</span>
              <span className="money font-display text-xl font-semibold">{brlCents(total)}</span>
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Seu nome
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
              placeholder="Como aparece para o garçom"
              className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] outline-none focus:border-ink/40"
            />
          </label>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Forma de pagamento</p>
            <div
              className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-surface"
              role="radiogroup"
              aria-label="Forma de pagamento"
            >
              {METHODS.map((m) => {
                const Icon = METHOD_ICON[m];
                const on = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMethod(m)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                        on ? "bg-ink text-white" : "bg-[oklch(0.955_0.005_250)] text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-tight">
                        {METHOD_LABEL[m]}
                      </span>
                      <span className="block text-xs text-muted-foreground">{METHOD_HINT[m]}</span>
                    </span>
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                        on ? "border-ink bg-ink" : "border-border",
                      )}
                    >
                      {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-[420px]">
          {step === 0 && (
            <PrimaryButton disabled={!preview} onClick={() => setStep(1)}>
              {preview ? (
                <>
                  Continuar · <span className="money">{brlCents(base)}</span>
                </>
              ) : (
                "Escolha o que pagar"
              )}
            </PrimaryButton>
          )}
          {step === 1 && (
            <>
              <PrimaryButton disabled={!preview || !tipReady} onClick={() => setStep(2)}>
                Continuar
                {tipCents > 0 && (
                  <>
                    {" "}
                    · gorjeta <span className="money">{brlCents(tipCents)}</span>
                  </>
                )}
              </PrimaryButton>
              {tip === null && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Escolha uma opção, ou "Sem gorjeta", para continuar.
                </p>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <PrimaryButton
                tone={method === "estabelecimento" ? "ink" : "pay"}
                disabled={busy || !preview || !name.trim() || !tipReady}
                onClick={async () => {
                  setBusy(true);
                  await onPaid(
                    mode,
                    method,
                    tip === "outro" || (chosen && !chosen.percent)
                      ? { tipCents }
                      : chosen?.percent
                        ? { tipPercent: chosen.percent }
                        : {},
                  );
                  setBusy(false);
                }}
              >
                {method === "estabelecimento" ? (
                  "Chamar o garçom para pagar"
                ) : (
                  <>
                    Pagar <span className="money">{brlCents(total)}</span> com{" "}
                    {METHOD_LABEL[method]}
                  </>
                )}
              </PrimaryButton>
              {!name.trim() && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Informe seu nome para continuar.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TipTile({
  on,
  onClick,
  badge,
  children,
}: {
  on: boolean;
  onClick: () => void;
  badge?: string | undefined;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "relative flex h-[60px] flex-col items-center justify-center rounded-2xl border leading-tight transition-[background-color,border-color,color] duration-150",
        on ? "border-ink bg-ink text-white" : "border-border/80 bg-surface hover:border-ink/30",
      )}
    >
      {children}
      {badge && (
        <span className="absolute -top-2 rounded-full bg-brand px-1.5 py-px text-[10px] font-semibold text-ink">
          {badge}
        </span>
      )}
    </button>
  );
}

function MoneyInput({
  value,
  onChange,
  label,
  placeholder,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  error?: string | null;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-xl border bg-surface px-3.5",
          error ? "border-destructive" : "border-border focus-within:border-ink/40",
        )}
      >
        <span className="text-sm text-muted-foreground">R$</span>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          autoFocus={autoFocus}
          className="money min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const parseBrl = (s: string) =>
  Number(
    s
      .replace(/[^\d,.]/g, "")
      .replace(/\.(?=\d{3})/g, "")
      .replace(",", "."),
  ) || 0;
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
    <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      <button
        type="button"
        aria-label="Menos"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 10_000) / 10_000))}
        className="grid h-7 w-7 place-items-center rounded-full text-foreground hover:bg-[oklch(0.95_0.005_250)] disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="money w-7 text-center text-[13px] font-semibold">{fmtQty(value)}</span>
      <button
        type="button"
        aria-label="Mais"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 10_000) / 10_000))}
        className="grid h-7 w-7 place-items-center rounded-full text-foreground hover:bg-[oklch(0.95_0.005_250)] disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

const Row = ({ label, cents }: { label: string; cents: number }) => (
  <div className="flex justify-between py-0.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="money">{brlCents(cents)}</span>
  </div>
);

function EmptyNote({
  text,
  action,
  onAction,
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="mx-auto max-w-[260px] text-sm text-muted-foreground">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
      >
        {action}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- confirmação

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
    <div className="demo-step pt-2 text-center">
      {p.method === "estabelecimento" ? (
        <>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand-strong">
            <HandCoins className="h-7 w-7" />
          </span>
          <p className="mt-4 font-display text-xl font-semibold">
            {p.payer}, o garçom já foi avisado
          </p>
          <p className="mx-auto mt-2 max-w-[300px] text-sm text-muted-foreground">
            Pague{" "}
            <span className="money font-semibold text-foreground">{brlCents(totalCents(p))}</span>{" "}
            em dinheiro ou na maquininha. A conta se atualiza quando ele confirmar.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> Aguardando o garçom
            (perfil Garçom, em outra aba)
          </p>
        </>
      ) : p.method === "pix" ? (
        <>
          <p className="text-[13px] text-muted-foreground">Pix de</p>
          <p className="money font-display text-[32px] font-semibold leading-tight tracking-display">
            {brlCents(totalCents(p))}
          </p>
          <div className="mx-auto mt-5 w-fit rounded-3xl border border-border/70 bg-surface p-4 shadow-[0_8px_30px_-16px_oklch(0.2_0.04_250/0.35)]">
            <FakeQr seed={p.id} />
            <p className="mt-3 text-[11px] text-muted-foreground">
              QR de demonstração, sem valor real
            </p>
          </div>
          <p className="mx-auto mt-4 max-w-[280px] text-xs text-muted-foreground">
            Na conta real, o banco confirma o Pix em segundos e a mesa inteira vê na hora.
          </p>
          <div className="mt-5">
            <PrimaryButton tone="pay" onClick={confirm}>
              Simular confirmação do banco
            </PrimaryButton>
          </div>
        </>
      ) : (
        <>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ink text-white">
            {(() => {
              const Icon = METHOD_ICON[p.method];
              return <Icon className="h-7 w-7" />;
            })()}
          </span>
          <p className="mt-4 font-display text-xl font-semibold">{METHOD_LABEL[p.method]}</p>
          <p className="money mt-1 text-sm text-muted-foreground">{brlCents(totalCents(p))}</p>
          <p className="mx-auto mt-3 max-w-[280px] text-xs text-muted-foreground">
            No celular, a carteira pede Face ID ou a digital.
          </p>
          <div className="mt-6">
            <PrimaryButton tone="pay" onClick={confirm}>
              Simular confirmação ({brlCents(totalCents(p))})
            </PrimaryButton>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        Desistir e liberar os itens
      </button>
    </div>
  );
}

/** Desenho de QR só ilustrativo, gerado a partir do id (não é um código Pix válido). */
function FakeQr({ seed }: { seed: string }) {
  const n = 21;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      if (finder) continue;
      h = (h * 1103515245 + 12345) >>> 0;
      if (h % 100 < 46) cells.push([x, y]);
    }
  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g>
      <rect x={x} y={y} width={7} height={7} rx={1.6} className="fill-ink" />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={1.1} className="fill-surface" />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} className="fill-ink" />
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      className="h-44 w-44"
      role="img"
      aria-label="QR Pix de demonstração"
    >
      {cells.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x + 0.08}
          y={y + 0.08}
          width={0.84}
          height={0.84}
          rx={0.25}
          className="fill-ink"
        />
      ))}
      <Finder x={0} y={0} />
      <Finder x={n - 7} y={0} />
      <Finder x={0} y={n - 7} />
    </svg>
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
  const waiter = state.staff.find((s) => s.id === p.waiterId)?.name.split(" ")[0] ?? "a equipe";
  return (
    <div className="space-y-4">
      <div className="pt-2 text-center">
        <span className="demo-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-ink shadow-[0_12px_30px_-10px_oklch(0.77_0.14_178/0.8)]">
          <Check className="h-8 w-8" strokeWidth={3} />
        </span>
        <p className="mt-4 font-display text-2xl font-semibold tracking-heading">
          Pagamento aprovado
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="money">{brlCents(totalCents(p))}</span> · {METHOD_LABEL[p.method]}
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface p-5 text-center">
        {rated ? (
          <p className="text-sm">
            Obrigado pela avaliação de {rated.stars} {rated.stars === 1 ? "estrela" : "estrelas"}.
          </p>
        ) : (
          <>
            <p className="font-display text-[17px] font-semibold">Como foi com {waiter}?</p>
            <div className="mt-3 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrelas`}
                  onClick={() => setStars(n)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    className={cn(
                      "h-9 w-9",
                      n <= stars ? "fill-warning text-warning" : "text-border",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <div className="demo-fade">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={280}
                  rows={2}
                  placeholder="Quer contar algo? (opcional)"
                  className="mt-4 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-ink/40"
                />
                <div className="mt-2">
                  <PrimaryButton
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
                  </PrimaryButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <details className="group rounded-2xl border border-border/70 bg-surface text-[13px]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold">
          Comprovante
          <ChevronRight className="h-4 w-4 text-muted-foreground transition group-open:rotate-90" />
        </summary>
        <div className="space-y-1 border-t border-border/70 px-4 py-3">
          <p className="text-muted-foreground">
            {state.restaurant.name} · Mesa {p.table} ·{" "}
            {new Date(p.approvedAt ?? p.createdAt).toLocaleString("pt-BR")}
          </p>
          {lines.map((l) => (
            <p key={l.id}>
              {fmtQty(p.portions[l.id] ?? 0)}× {l.name}
            </p>
          ))}
          <div className="pt-1">
            <Row label="Itens" cents={p.subtotalCents} />
            <Row label="Serviço" cents={p.serviceCents} />
            <Row label="Gorjeta" cents={p.tipCents} />
          </div>
          <p className="pt-2 text-[11px] text-muted-foreground">
            Documento sem valor fiscal. A nota fiscal depende da integração com o PDV do
            restaurante.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir ou salvar PDF
          </button>
        </div>
      </details>

      <PrimaryButton tone="light" onClick={onBack}>
        Voltar para a conta
      </PrimaryButton>
    </div>
  );
}
