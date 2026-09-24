import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, CreditCard, QrCode, Smartphone, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { TipeSymbol } from "@/components/tipe/Logo";
import { getTableBill } from "@/lib/tipe/pdv.functions";
import { createPayment, type PaymentResult } from "@/lib/tipe/payments.functions";
import { brl, splitTip, totals } from "@/lib/tipe/rules";

const billQuery = (restaurantId: string, tableId: string) =>
  queryOptions({ queryKey: ["bill", restaurantId, tableId], queryFn: () => getTableBill({ data: { restaurantId, tableId } }) });

export const Route = createFileRoute("/mesa/$restaurante/$mesa")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(billQuery(params.restaurante, params.mesa)),
  head: ({ params }) => ({
    meta: [
      { title: `Mesa ${params.mesa} — TIPE` },
      { name: "description", content: "Confira sua conta, pague pelo celular e deixe sua gorjeta." },
      { property: "og:title", content: `Mesa ${params.mesa} — TIPE` },
      { property: "og:description", content: "Pagou. Conferiu. Tipou. Foi." },
    ],
  }),
  errorComponent: () => <div className="p-8 text-center">Não conseguimos carregar a conta desta mesa. Chame o garçom.</div>,
  notFoundComponent: () => <div className="p-8 text-center">Mesa não encontrada.</div>,
  component: ClientFlow,
});

type Step = "welcome" | "bill" | "tip" | "pay" | "pix" | "done";
const methods = [
  { id: "pix", label: "Pix", icon: QrCode },
  { id: "apple_pay", label: "Apple Pay", icon: Smartphone },
  { id: "google_pay", label: "Google Pay", icon: Smartphone },
  { id: "card", label: "Cartão", icon: CreditCard },
] as const;

function ClientFlow() {
  const { restaurante, mesa } = Route.useParams();
  const { data: bill } = useSuspenseQuery(billQuery(restaurante, mesa));
  const pay = useServerFn(createPayment);

  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"all" | "items" | "split">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [people, setPeople] = useState(2);
  const [tipPct, setTipPct] = useState(0);
  const [rating, setRating] = useState(5);
  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("pix");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const base = useMemo(() => {
    if (mode === "items") return totals(bill.items, selected).total;
    const t = totals(bill.items).total - bill.paid;
    return mode === "split" ? +(t / people).toFixed(2) : t;
  }, [mode, selected, people, bill]);
  const all = totals(bill.items);
  const tip = +(base * tipPct).toFixed(2);

  async function submit() {
    setLoading(true);
    try {
      const r = await pay({ data: { method, amount: base, tip, tableId: mesa, restaurantId: restaurante, idempotencyKey: crypto.randomUUID() } });
      setResult(r);
      setStep(r.pixCode ? "pix" : "done");
    } catch (e) {
      toast.error((e as Error).message || "Falha no pagamento");
    } finally { setLoading(false); }
  }

  const back = { bill: "welcome", tip: "bill", pay: "tip", pix: "pay" } as Partial<Record<Step, Step>>;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="flex items-center justify-between px-5 py-4" style={{ background: "var(--gradient-brand)" }}>
          {back[step] ? (
            <button onClick={() => setStep(back[step]!)} aria-label="Voltar" className="text-secondary-foreground"><ArrowLeft /></button>
          ) : <TipeSymbol className="h-7 w-7" />}
          <div className="text-right text-secondary-foreground">
            <p className="text-xs opacity-70">{bill.restaurant.name}</p>
            <p className="font-display font-semibold">Mesa {bill.table.number}</p>
          </div>
        </header>
        {bill.source === "simulado" && (
          <p className="bg-accent px-5 py-1.5 text-center text-xs text-accent-foreground">Modo demonstração — conta simulada do PDV Saipos</p>
        )}

        <section className="flex-1 px-5 py-6">
          {step === "welcome" && (
            <div className="flex h-full flex-col">
              <h1 className="font-display text-3xl font-bold">Olá! 👋</h1>
              <p className="mt-2 text-muted-foreground">Confira sua conta e pague direto pelo celular. Você foi atendido por <b className="text-foreground">{bill.waiter.name}</b>.</p>
              <label className="mt-8 text-sm font-semibold">Como podemos te chamar?</label>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Seu nome"
                className="mt-2 rounded-xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
              <div className="mt-auto pt-8"><Primary disabled={!name.trim()} onClick={() => setStep("bill")}>Ver minha conta</Primary></div>
            </div>
          )}

          {step === "bill" && (
            <div>
              <h1 className="font-display text-2xl font-bold">Sua conta</h1>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted p-1 text-sm font-semibold">
                {([["all", "Tudo"], ["items", "Meus itens"], ["split", "Dividir"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setMode(k)} className={`rounded-lg py-2 ${mode === k ? "bg-card shadow" : "text-muted-foreground"}`}>{l}</button>
                ))}
              </div>
              <ul className="mt-4 divide-y divide-border rounded-2xl bg-card">
                {bill.items.map((i) => {
                  const on = selected.has(i.id);
                  return (
                    <li key={i.id} className="flex items-center gap-3 px-4 py-3"
                      onClick={() => mode === "items" && setSelected((s) => { const n = new Set(s); on ? n.delete(i.id) : n.add(i.id); return n; })}>
                      {mode === "items" && (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${on ? "border-primary bg-primary" : "border-input"}`}>{on && <Check className="h-3 w-3" />}</span>
                      )}
                      <span className="text-muted-foreground">{i.qty}×</span>
                      <span className="flex-1">{i.name}</span>
                      <span className="font-semibold">{brl(i.qty * i.unitPrice)}</span>
                    </li>
                  );
                })}
              </ul>
              {mode === "split" && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-card px-4 py-3">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Pessoas</span>
                  <div className="flex items-center gap-3">
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => setPeople((p) => Math.max(2, p - 1))}>−</button>
                    <b>{people}</b>
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => setPeople((p) => Math.min(20, p + 1))}>+</button>
                  </div>
                </div>
              )}
              <dl className="mt-4 space-y-1 text-sm">
                <Row l="Subtotal da mesa" v={brl(all.subtotal)} />
                <Row l="Taxa de serviço (10%)" v={brl(all.service)} />
                <Row l="Total da mesa" v={brl(all.total)} />
              </dl>
              <div className="mt-4 flex items-end justify-between rounded-2xl bg-secondary p-4 text-secondary-foreground">
                <span className="text-sm opacity-70">Você paga</span>
                <span className="font-display text-3xl font-bold text-primary">{brl(base)}</span>
              </div>
              <div className="mt-6"><Primary disabled={base <= 0} onClick={() => setStep("tip")}>Continuar</Primary></div>
            </div>
          )}

          {step === "tip" && (
            <div>
              <h1 className="font-display text-2xl font-bold">Como foi o atendimento?</h1>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} estrelas`}>
                    <Star className={`h-9 w-9 ${n <= rating ? "fill-highlight text-highlight" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <h2 className="mt-8 font-semibold">Gorjeta extra para {bill.waiter.name.split(" ")[0]}</h2>
              <p className="text-sm text-muted-foreground">Opcional. A taxa de serviço já está incluída.</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[0, 0.05, 0.1, 0.15].map((p) => (
                  <button key={p} onClick={() => setTipPct(p)}
                    className={`rounded-xl border py-3 font-semibold ${tipPct === p ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`}>
                    {p === 0 ? "Não" : `${p * 100}%`}
                  </button>
                ))}
              </div>
              {tip > 0 && <p className="mt-3 text-sm text-muted-foreground">{brl(tip)} — {brl(splitTip(tip).waiter)} vão direto para o garçom.</p>}
              <div className="mt-8"><Primary onClick={() => setStep("pay")}>Ir para pagamento · {brl(base + tip)}</Primary></div>
            </div>
          )}

          {step === "pay" && (
            <div>
              <h1 className="font-display text-2xl font-bold">Forma de pagamento</h1>
              <div className="mt-4 space-y-2">
                {methods.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-4 ${method === m.id ? "border-primary ring-2 ring-primary" : "border-input"}`}>
                    <m.icon className="h-5 w-5 text-info" /><span className="font-semibold">{m.label}</span>
                  </button>
                ))}
              </div>
              <dl className="mt-6 space-y-1 text-sm">
                <Row l="Conta" v={brl(base)} />
                <Row l="Gorjeta extra" v={brl(tip)} />
              </dl>
              <div className="mt-6"><Primary disabled={loading} onClick={submit}>{loading ? "Processando..." : `Pagar ${brl(base + tip)}`}</Primary></div>
            </div>
          )}

          {step === "pix" && result?.pixCode && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold">Pague com Pix</h1>
              <p className="mt-1 text-muted-foreground">Copie o código e cole no app do seu banco.</p>
              <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-2xl bg-card"><QrCode className="h-32 w-32" /></div>
              <p className="mt-4 break-all rounded-xl bg-muted p-3 text-xs">{result.pixCode}</p>
              <button className="mt-3 inline-flex items-center gap-2 font-semibold text-info"
                onClick={() => { navigator.clipboard.writeText(result.pixCode!); toast.success("Código copiado"); }}>
                <Copy className="h-4 w-4" /> Copiar código
              </button>
              <div className="mt-8"><Primary onClick={() => setStep("done")}>Já paguei</Primary></div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center pt-10 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary" style={{ boxShadow: "var(--shadow-glow)" }}>
                <Check className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold">Tipou. Foi!</h1>
              <p className="mt-2 text-muted-foreground">Obrigado, {name}. Pagamento de {brl(base + tip)} confirmado.</p>
              <p className="mt-1 text-xs text-muted-foreground">Comprovante {result?.id}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{l}</dt><dd className="font-medium">{v}</dd></div>;
}

function Primary(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} style={{ boxShadow: "var(--shadow-glow)" }}
    className="w-full rounded-2xl bg-primary py-4 font-display font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40" />;
}
