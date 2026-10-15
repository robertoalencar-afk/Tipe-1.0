import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  HandCoins,
  Heart,
  QrCode,
  ReceiptText,
  Smartphone,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { TipeLogo } from "@/components/tipe/Logo";
import { markSimulatorUsed } from "@/lib/tipe/tracking";
import { SplitPicker } from "@/components/tipe/SplitPicker";
import { resolveServiceFee } from "@/lib/tipe/rules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import mascotThanks from "@/assets/mascot-thanks-hd.webp";
import mascotRating from "@/assets/mascot-rating-hd.webp";
import mascotWaiting from "@/assets/mascot-waiting-hd.webp";
import mascotTableClosed from "@/assets/mascot-table-closed-hd.webp";

type Stage =
  | "totem"
  | "identification"
  | "bill"
  | "payment"
  | "approved"
  | "pitch"
  | "pending"
  | "rating"
  | "tip"
  | "tip-payment"
  | "closed"
  | "done";
type Tab = "bill" | "activity";
type Method = "pix" | "apple_pay" | "google_pay" | "at_establishment";
type EstablishmentMethod = "cash" | "card_terminal";
type DemoPayment = {
  id: string;
  name: string;
  amount: number;
  quantities: Record<string, number>;
  status: "pending" | "approved";
  createdAt: string;
  establishmentMethod?: EstablishmentMethod;
  cashReceived?: number;
  changeDue?: number;
};

type DemoState = {
  paid: Record<string, number>;
  reserved: Record<string, number>;
  payments: DemoPayment[];
  closedAt: number | null;
};

const ITEMS = [
  { id: "1", name: "Moqueca de peixe", qty: 2, price: 89, date: "26/09/2026", time: "12:18" },
  { id: "2", name: "Camarão na moranga", qty: 1, price: 112, date: "26/09/2026", time: "12:21" },
  { id: "3", name: "Caipirinha de limão", qty: 3, price: 24, date: "26/09/2026", time: "12:27" },
  { id: "4", name: "Água com gás", qty: 2, price: 8, date: "26/09/2026", time: "12:31" },
  { id: "5", name: "Pudim de leite", qty: 1, price: 18, date: "26/09/2026", time: "13:04" },
] as const;

const EMPTY_STATE: DemoState = { paid: {}, reserved: {}, payments: [], closedAt: null };
const STATE_KEY = "tipe:simulador:mesa12:state";
const NAME_KEY = "tipe:simulador:mesa12:cliente";
const REOPEN_MS = 5 * 1000;
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fullName = (value: string) => value.trim().split(/\s+/).length >= 2;
const EPSILON = 0.0001;
const roundPortion = (value: number) => Math.round(value * 10000) / 10000;
const formatPortion = (value: number) => {
  const rounded = roundPortion(value);
  const whole = Math.floor(rounded + EPSILON);
  const fraction = rounded - whole;
  const fractionLabel =
    Math.abs(fraction - 0.5) < EPSILON
      ? "metade"
      : Math.abs(fraction - 1 / 3) < EPSILON
        ? "1/3"
        : Math.abs(fraction - 0.25) < EPSILON
          ? "1/4"
          : fraction > EPSILON
            ? `${Math.round(fraction * 100)}%`
            : "";
  if (!whole) return fractionLabel || "0";
  return fractionLabel
    ? `${whole} unidade${whole === 1 ? "" : "s"} + ${fractionLabel}`
    : `${whole} unidade${whole === 1 ? "" : "s"}`;
};

const METHOD_DETAILS: Record<Method, { label: string; description: string; Icon: typeof QrCode }> =
  {
    pix: { label: "Pix", description: "Confirmação simulada na hora", Icon: QrCode },
    apple_pay: {
      label: "Apple Pay",
      description: "Pagamento em um toque no iPhone",
      Icon: Smartphone,
    },
    google_pay: {
      label: "Google Pay",
      description: "Pagamento em um toque no Android",
      Icon: WalletCards,
    },
    at_establishment: {
      label: "Pagar no estabelecimento",
      description: "Dinheiro ou maquininha",
      Icon: HandCoins,
    },
  };

function readState(): DemoState {
  try {
    const stored = window.localStorage.getItem(STATE_KEY);
    if (!stored) return EMPTY_STATE;
    const parsed = JSON.parse(stored) as DemoState;
    if (parsed.closedAt) {
      window.localStorage.removeItem(STATE_KEY);
      window.localStorage.removeItem(NAME_KEY);
      return EMPTY_STATE;
    }
    return parsed;
  } catch {
    return EMPTY_STATE;
  }
}

export function SimulatorExperience({ enterDirectly }: { enterDirectly: boolean }) {
  const [stage, setStage] = useState<Stage>(enterDirectly ? "identification" : "totem");
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("bill");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [splitting, setSplitting] = useState<string | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [establishmentMethod, setEstablishmentMethod] = useState<EstablishmentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState("");
  const [tipMethod, setTipMethod] = useState<Exclude<Method, "at_establishment"> | null>(null);
  const [terms, setTerms] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [demo, setDemo] = useState<DemoState>(EMPTY_STATE);

  useEffect(() => {
    for (const src of [mascotWaiting, mascotThanks, mascotRating, mascotTableClosed]) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  useEffect(() => {
    const current = readState();
    setDemo(current);
    const savedName = window.localStorage.getItem(NAME_KEY)?.trim() ?? "";
    const hasPending =
      !current.closedAt && current.payments.some((payment) => payment.status === "pending");
    if (enterDirectly && fullName(savedName)) {
      setName(savedName);
      setStage(current.closedAt ? "closed" : hasPending ? "pending" : "bill");
    } else if (current.closedAt) {
      setStage("closed");
    } else if (hasPending) {
      setStage("pending");
    }
  }, [enterDirectly]);

  useEffect(() => {
    if (!demo.closedAt) return;
    const remaining = Math.max(0, REOPEN_MS - (Date.now() - demo.closedAt));
    const timer = window.setTimeout(() => {
      window.localStorage.removeItem(STATE_KEY);
      window.localStorage.removeItem(NAME_KEY);
      setDemo(EMPTY_STATE);
      setName("");
      setQuantities({});
      setStage("totem");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [demo.closedAt]);

  const available = (id: string, qty: number) =>
    roundPortion(Math.max(0, qty - (demo.paid[id] ?? 0) - (demo.reserved[id] ?? 0)));
  const subtotal = useMemo(
    () => ITEMS.reduce((sum, item) => sum + item.price * (quantities[item.id] ?? 0), 0),
    [quantities],
  );
  const [feeWaived, setFeeWaived] = useState(false);
  const service = resolveServiceFee(subtotal, feeWaived ? 0 : 0.1, { kind: "suggested" })!.amount;
  const total = +(subtotal + service).toFixed(2);
  const allSelected = ITEMS.every(
    (item) => Math.abs((quantities[item.id] ?? 0) - available(item.id, item.qty)) < EPSILON,
  );
  const pendingEstablishmentPayment = demo.payments.find(
    (payment) => payment.status === "pending" && payment.establishmentMethod,
  );

  const saveDemo = (next: DemoState) => {
    setDemo(next);
    window.localStorage.setItem(STATE_KEY, JSON.stringify(next));
  };

  const identify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identified = name.trim();
    if (!fullName(identified)) return;
    window.localStorage.setItem(NAME_KEY, identified);
    setName(identified);
    setStage("bill");
  };

  const payBill = () => {
    if (!method || total <= 0) return;
    setPaidAmount(total);
    const status = method === "at_establishment" ? "pending" : "approved";
    const selected = Object.fromEntries(Object.entries(quantities).filter(([, qty]) => qty > 0));
    const nextPaid = { ...demo.paid };
    const nextReserved = { ...demo.reserved };
    for (const [id, qty] of Object.entries(selected)) {
      if (status === "approved") nextPaid[id] = (nextPaid[id] ?? 0) + qty;
      else nextReserved[id] = (nextReserved[id] ?? 0) + qty;
    }
    const closed =
      status === "approved" &&
      ITEMS.every((item) => (nextPaid[item.id] ?? 0) >= item.qty - EPSILON);
    if (
      method === "at_establishment" &&
      (!establishmentMethod ||
        (establishmentMethod === "cash" && Number(cashReceived.replace(",", ".")) < total))
    )
      return;
    const tendered =
      establishmentMethod === "cash" ? Number(cashReceived.replace(",", ".")) : undefined;
    const payment: DemoPayment = {
      id: crypto.randomUUID(),
      name: name.trim(),
      amount: total,
      quantities: selected,
      status,
      createdAt: new Date().toISOString(),
      ...(method === "at_establishment" && establishmentMethod ? { establishmentMethod } : {}),
      ...(tendered !== undefined
        ? { cashReceived: tendered, changeDue: Math.round((tendered - total) * 100) / 100 }
        : {}),
    };
    saveDemo({
      ...demo,
      paid: nextPaid,
      reserved: nextReserved,
      payments: [payment, ...demo.payments],
      closedAt: closed ? Date.now() : demo.closedAt,
    });
    setQuantities({});
    setStage(status === "approved" ? "approved" : "pending");
  };

  const confirmEstablishment = () => {
    const nextPaid = { ...demo.paid };
    const nextReserved = { ...demo.reserved };
    const payments = demo.payments.map((payment) => {
      if (payment.status !== "pending") return payment;
      for (const [id, qty] of Object.entries(payment.quantities)) {
        nextReserved[id] = Math.max(0, (nextReserved[id] ?? 0) - qty);
        nextPaid[id] = (nextPaid[id] ?? 0) + qty;
      }
      return { ...payment, status: "approved" as const };
    });
    const closed = ITEMS.every((item) => (nextPaid[item.id] ?? 0) >= item.qty - EPSILON);
    saveDemo({
      paid: nextPaid,
      reserved: nextReserved,
      payments,
      closedAt: closed ? Date.now() : null,
    });
    setStage("rating");
  };

  const continueAfterApproved = () => {
    setStage("pitch");
  };
  useEffect(() => {
    markSimulatorUsed();
  }, []);

  if (stage === "totem") {
    return (
      <main className="customer-theme flex min-h-svh items-center justify-center bg-secondary p-5 text-secondary-foreground">
        <section className="w-full max-w-sm text-center">
          <TipeLogo className="mx-auto h-16" />
          <p className="mt-4 font-display text-xl font-bold text-primary">Pague. Sem esperar.</p>
          <div className="mt-7 rounded-lg bg-card p-5 text-card-foreground">
            <p className="text-sm font-semibold">Mesa 12 · Maré Alta</p>
            <Button
              variant="ghost"
              onClick={() => setStage("identification")}
              className="mx-auto mt-4 h-auto bg-card p-3 hover:bg-muted [&_svg]:h-[180px] [&_svg]:w-[180px]"
              aria-label="Abrir simulação da Mesa 12"
            >
              <QRCodeSVG
                value="https://tipe.digital/simulador?mesa=12"
                size={180}
                bgColor="transparent"
                fgColor="currentColor"
              />
            </Button>
            <p className="mt-4 text-sm font-semibold">Aponte a câmera para o QR Code</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ou toque no código para simular a leitura
            </p>
          </div>
          <div className="mt-5 rounded-lg border border-primary/35 bg-primary/10 px-4 py-3 text-sm leading-6">
            <strong>Demonstração:</strong> este QR Code, os itens e os pagamentos são apenas para
            simular a experiência TIPE.
          </div>
          <Link
            to="/"
            target="_top"
            className="mt-6 inline-block text-sm font-semibold text-primary"
          >
            Voltar ao site
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="customer-theme mx-auto flex min-h-svh max-w-md flex-col bg-background">
      <header className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex">
            <TipeLogo variant="dark" className="h-7 [@media(prefers-color-scheme:dark)]:hidden" />
            <TipeLogo className="hidden h-7 [@media(prefers-color-scheme:dark)]:block" />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              Simulação
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
              <span className="tipe-live h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Mesa 12
            </span>
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Maré Alta</p>
        <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Etapas do pagamento">
          {["Conta", "Pagamento", "Pronto"].map((rotulo, index) => {
            const passo =
              stage === "bill" || stage === "identification"
                ? 0
                : stage === "payment" || stage === "pending"
                  ? 1
                  : 2;
            return (
              <li key={rotulo} aria-current={index === passo ? "step" : undefined}>
                <span
                  className={`block h-1 rounded-full ${index <= passo ? "bg-primary" : "bg-border"}`}
                />
                <span
                  className={`mt-1.5 block text-[11px] font-semibold ${index === passo ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {rotulo}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      {stage === "identification" && (
        <main className="flex flex-1 flex-col justify-center px-6 pb-24">
          <p className="eyebrow text-brand-strong">Mesa 12</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-[1.1] tracking-heading">
            Olá! Qual é o seu nome?
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Seu nome identifica os itens que você escolher pagar nesta simulação.
          </p>
          <form onSubmit={identify} className="mt-8">
            <label htmlFor="demo-name" className="text-sm font-semibold">
              Nome e sobrenome
            </label>
            <Input
              id="demo-name"
              autoFocus
              autoComplete="name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Digite seu nome e sobrenome"
              className="mt-2 h-13 rounded-2xl px-4 text-base"
            />
            <Button
              type="submit"
              disabled={!fullName(name)}
              className="mt-5 h-12 w-full font-display text-base"
            >
              Ver minha mesa <ChevronRight />
            </Button>
          </form>
        </main>
      )}

      {stage === "bill" && (
        <main className="flex flex-1 flex-col px-5 pb-8">
          <h1 className="mt-1 font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Olá, {name.trim()}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atendimento de <strong className="text-foreground">Carlos</strong>
          </p>
          <div className="mb-6 mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            <Button
              variant={tab === "bill" ? "outline" : "ghost"}
              onClick={() => setTab("bill")}
              className="h-10 rounded-full shadow-none"
            >
              <ReceiptText /> Conta
            </Button>
            <Button
              variant={tab === "activity" ? "outline" : "ghost"}
              onClick={() => setTab("activity")}
              className="h-10 rounded-full shadow-none"
            >
              <ClipboardList /> Atividade
            </Button>
          </div>
          {tab === "bill" ? (
            !ITEMS.some((item) => available(item.id, item.qty) > 0) &&
            demo.payments.some((payment) => payment.status === "pending") ? (
              <div className="mt-4 rounded-2xl border border-highlight/40 bg-highlight/10 p-5 text-center">
                <p className="text-sm font-semibold text-highlight">Aguardando confirmação</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Seu pagamento no estabelecimento está pendente. Assim que o restaurante confirmar,
                  os itens saem da conta.
                </p>
                <Button
                  onClick={() => setStage("pending")}
                  className="mt-5 h-11 w-full font-display text-base"
                >
                  Ver status do pagamento <ChevronRight />
                </Button>
              </div>
            ) : (
              <>
                {ITEMS.some((item) => available(item.id, item.qty) > 0) && (
                  <Button
                    variant={allSelected ? "default" : "outline"}
                    onClick={() =>
                      setQuantities(
                        Object.fromEntries(
                          ITEMS.map((item) => [
                            item.id,
                            allSelected ? 0 : available(item.id, item.qty),
                          ]),
                        ),
                      )
                    }
                    className="mb-3 h-12 w-full font-display text-base"
                  >
                    <ReceiptText /> {allSelected ? "Limpar seleção" : "Pagar a conta inteira"}
                  </Button>
                )}
                <h2 className="font-display text-lg font-semibold tracking-heading">
                  O que você vai pagar?
                </h2>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">
                  Escolha quanto de cada item ficará com você.
                </p>
                <ul className="flex flex-col gap-3">
                  {ITEMS.filter((item) => available(item.id, item.qty) > 0).map((item) => {
                    const qty = quantities[item.id] ?? 0;
                    const max = available(item.id, item.qty);
                    return (
                      <li
                        key={item.id}
                        className={`rounded-2xl border bg-card p-4 transition-colors ${qty > 0 ? "border-primary bg-brand-soft/40 ring-1 ring-primary" : "border-border"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantities((current) => ({
                                ...current,
                                [item.id]: qty >= Math.floor(max) ? 0 : Math.floor(qty) + 1,
                              }))
                            }
                            aria-label={`Adicionar uma unidade de ${item.name}`}
                            className={`mt-0.5 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border transition ${qty > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}
                          >
                            {qty > 0 && <Check className="h-3.5 w-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {money(item.price)} cada · {formatPortion(max)}{" "}
                              {max > 1 ? "disponíveis" : "disponível"}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold">
                            {money(item.price * qty)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                          <span className="text-xs text-muted-foreground">Quantidade a pagar</span>
                          <select
                            value={qty}
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [item.id]: Number(event.target.value),
                              }))
                            }
                            className="h-10 min-w-[4.5rem] rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/40"
                            aria-label={`Quantidade de ${item.name}`}
                          >
                            {Math.abs(qty - Math.round(qty)) > EPSILON && (
                              <option value={qty}>{formatPortion(qty)}</option>
                            )}
                            {Array.from({ length: Math.floor(max) + 1 }, (_, number) => (
                              <option key={number} value={number}>
                                {number}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-2 flex min-h-9 items-center justify-end">
                          {splitting === item.id ? (
                            <SplitPicker
                              itemName={item.name}
                              unitPrice={item.price}
                              onPick={(c) => {
                                if (c === "rest")
                                  setQuantities((current) => ({ ...current, [item.id]: max }));
                                else {
                                  const whole = Math.floor(qty);
                                  setQuantities((current) => ({
                                    ...current,
                                    [item.id]: roundPortion(
                                      Math.min(
                                        max,
                                        whole + Math.min(1 / c, Math.max(0, max - whole)),
                                      ),
                                    ),
                                  }));
                                }
                                setSplitting(null);
                              }}
                            />
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setSplitting(item.id)}
                              className="text-brand-strong"
                            >
                              Dividir este item
                            </Button>
                          )}
                        </div>
                        {qty > 0 && (
                          <p className="mt-1 text-right text-xs font-semibold text-brand-strong">
                            Você paga {formatPortion(qty)}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">
                  <Summary label="Subtotal selecionado" value={subtotal} />
                  <Summary
                    label={
                      feeWaived
                        ? "Taxa de serviço removida pelo restaurante"
                        : "Taxa de serviço (10%)"
                    }
                    value={service}
                    className="mt-2"
                  />
                  <Summary
                    label="Total da conta"
                    value={total}
                    className="mt-3 border-t border-border pt-3 font-display text-base font-extrabold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFeeWaived((v) => !v)}
                  className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground underline underline-offset-4"
                >
                  {feeWaived
                    ? "Demonstração: voltar a taxa de serviço"
                    : "Demonstração: restaurante remove a taxa desta mesa"}
                </button>
                <Button
                  disabled={subtotal <= 0}
                  onClick={() => setStage("payment")}
                  className="mt-5 h-12 w-full font-display text-base"
                >
                  Continuar para pagamento <ChevronRight />
                </Button>
              </>
            )
          ) : (
            <section aria-labelledby="demo-activity">
              <h2 id="demo-activity" className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-primary" /> Registro dos pedidos
              </h2>
              <ol className="border-l border-border pl-4">
                {ITEMS.map((item) => (
                  <li
                    key={item.id}
                    className="relative border-b border-border py-4 first:pt-1 last:border-0"
                  >
                    <span className="absolute -left-[1.18rem] top-5 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex justify-between gap-3">
                      <p className="font-medium">
                        {item.qty}× {item.name}
                      </p>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>{item.date}</p>
                        <p>{item.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {demo.payments.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="mb-2 text-sm font-semibold">Pagamentos</h3>
                  {demo.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="border-b border-border py-4 text-sm last:border-0"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-semibold">{payment.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(payment.createdAt))}
                          </p>
                          {payment.establishmentMethod && (
                            <p className="mt-1 text-xs font-semibold">
                              {payment.establishmentMethod === "cash"
                                ? `Dinheiro · Troco ${money(payment.changeDue ?? 0)}`
                                : "Maquininha"}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{money(payment.amount)}</p>
                          <p
                            className={
                              payment.status === "pending"
                                ? "text-xs font-semibold text-highlight"
                                : "text-xs font-semibold text-primary"
                            }
                          >
                            {payment.status === "pending" ? "Pendente" : "Confirmado"}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
                        {Object.entries(payment.quantities).map(([id, qty]) => (
                          <li key={id}>
                            {formatPortion(qty)} de {ITEMS.find((item) => item.id === id)?.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {stage === "payment" && (
        <PaymentScreen
          title="Pagamento da conta"
          description="Este pagamento corresponde apenas aos itens escolhidos. Após a confirmação, a conta da mesa será atualizada automaticamente."
          value={total}
          method={method}
          setMethod={setMethod}
          terms={terms}
          setTerms={setTerms}
          back={() => setStage("bill")}
          pay={payBill}
          allowEstablishment
          establishmentMethod={establishmentMethod}
          setEstablishmentMethod={setEstablishmentMethod}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
        />
      )}

      {stage === "pending" && (
        <Centered>
          <img
            src={mascotWaiting}
            alt="Mascote TIPE aguardando"
            className="mx-auto mb-3 h-44 w-44 object-contain"
          />
          <p className="text-sm font-semibold text-highlight">Pendente de confirmação</p>
          <h1 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Pagamento no estabelecimento
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {pendingEstablishmentPayment?.establishmentMethod === "cash"
              ? `Prepare o dinheiro. O garçom tratará do seu troco${pendingEstablishmentPayment.changeDue !== undefined ? ` de ${money(pendingEstablishmentPayment.changeDue)}` : ""} em breve.`
              : "O garçom irá em instantes até sua mesa com a maquininha."}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Seu pagamento só aparece como confirmado depois que o restaurante confirmar o
            recebimento.
          </p>
          <Button
            onClick={() => {
              setTab("activity");
              setStage("bill");
            }}
            className="mt-8 h-12 w-full font-display text-base"
          >
            Ver minha conta <ChevronRight />
          </Button>
          <div className="mt-8 rounded-lg border border-dashed border-border p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demonstração · visão do caixa
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Na vida real, este passo é feito pelo garçom ou caixa no painel do restaurante, não
              pelo cliente.
            </p>
            <Button
              variant="outline"
              onClick={confirmEstablishment}
              className="mt-3 h-10 w-full rounded-lg text-sm font-semibold"
            >
              Confirmar recebimento como restaurante
            </Button>
          </div>
        </Centered>
      )}
      {stage === "approved" && (
        <Centered>
          <img
            src={mascotThanks}
            alt="Mascote TIPE comemorando o pagamento aprovado"
            className="mx-auto mb-3 h-44 w-44 object-contain"
          />
          <p className="eyebrow text-brand-strong">Conta paga</p>
          <h1 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Pagamento confirmado!
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {money(paidAmount)} enviados ao Maré Alta.
          </p>
          <Button
            onClick={continueAfterApproved}
            className="mt-8 h-12 w-full font-display text-base"
          >
            Avaliar atendimento <ChevronRight />
          </Button>
        </Centered>
      )}
      {stage === "rating" && (
        <main className="flex flex-1 flex-col px-6 pb-10">
          <img
            src={mascotRating}
            alt="Mascote TIPE com uma estrela"
            className="mx-auto mb-3 h-28 w-28 object-contain"
          />
          <h1 className="text-center font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Como foi seu atendimento?
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sua avaliação ajuda o Carlos e o restaurante.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((number) => (
              <Button
                key={number}
                variant="ghost"
                size="icon"
                onClick={() => setStars(number)}
                aria-label={`${number} estrelas`}
                className="h-11 w-11"
              >
                <Star
                  className={`h-8 w-8 ${number <= stars ? "fill-highlight text-highlight" : "text-border"}`}
                />
              </Button>
            ))}
          </div>
          <label htmlFor="demo-comment" className="mt-8 text-sm font-semibold">
            Comentário <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Textarea
            id="demo-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Conte como foi sua experiência"
            maxLength={400}
            className="mt-2 min-h-28"
          />
          <Button onClick={() => setStage("tip")} className="mt-6 h-12 font-display text-base">
            Continuar <ChevronRight />
          </Button>
        </main>
      )}
      {stage === "tip" && (
        <main className="flex flex-1 flex-col px-6 pb-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-5 text-center font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Quer deixar uma gorjeta extra?
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
            Uma forma opcional de agradecer pelo atendimento.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[5, 10, 15, 20].map((value) => (
              <Button
                key={value}
                variant={tip === value ? "default" : "outline"}
                onClick={() => setTip(value)}
                className="h-14 font-display text-base"
              >
                {money(value)}
              </Button>
            ))}
          </div>
          {tip > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
              <p className="font-semibold">Gorjeta: {money(tip)}</p>
            </div>
          )}
          <Button
            disabled={tip <= 0}
            onClick={() => setStage("tip-payment")}
            className="mt-6 h-12 font-display text-base"
          >
            Continuar com gorjeta <ChevronRight />
          </Button>
          <Button variant="ghost" onClick={() => setStage("done")} className="mt-2 h-11">
            Agora não, obrigado
          </Button>
          <Link
            to="/legal/$livro"
            params={{ livro: "termos-de-uso" }}
            hash="gorjeta-extra"
            target="_blank"
            className="mt-3 block text-center text-sm font-semibold text-brand-strong underline-offset-2 hover:underline"
          >
            Como funciona a gorjeta?
          </Link>
        </main>
      )}
      {stage === "tip-payment" && (
        <PaymentScreen
          title="Pagamento da gorjeta"
          description="Cobrança opcional e separada da conta."
          value={tip}
          method={tipMethod}
          setMethod={setTipMethod}
          terms={true}
          setTerms={() => undefined}
          back={() => setStage("tip")}
          pay={() => setStage("done")}
        />
      )}
      {stage === "pitch" && (
        <Centered>
          <p className="eyebrow text-brand-strong">Gostou?</p>
          <h1 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Imagine isso em todas as mesas do seu restaurante.
          </h1>
          <a
            href="/#demonstracao"
            target="_top"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground"
          >
            Garantir meus 30 dias grátis
          </a>
          <Link to="/" target="_top" className="mt-5 block text-sm font-semibold text-primary">
            Voltar ao site
          </Link>
          <button
            type="button"
            onClick={() => setStage("rating")}
            className="mt-4 text-xs text-muted-foreground underline"
          >
            Continuar a demonstração
          </button>
        </Centered>
      )}
      {stage === "closed" && (
        <Centered>
          <img
            src={mascotTableClosed}
            alt="Mascote TIPE ao lado da conta encerrada"
            className="mx-auto h-52 w-52 object-contain"
          />
          <p className="mt-4 eyebrow text-brand-strong">Tudo confirmado</p>
          <h1 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Mesa encerrada
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Todos os itens desta mesa foram pagos e não há pagamentos pendentes.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            A demonstração recomeça automaticamente em instantes.
          </p>
          <Link to="/" target="_top" className="mt-8 text-sm font-semibold text-primary">
            Voltar ao site
          </Link>
        </Centered>
      )}
      {stage === "done" && (
        <Centered>
          <img
            src={mascotThanks}
            alt="Mascote TIPE agradecendo"
            className="mx-auto h-48 w-48 object-contain"
          />
          <p className="mt-5 eyebrow text-brand-strong">Tudo certo, {name.trim()}!</p>
          <h1 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
            Obrigado pela sua visita.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sua conta foi paga e sua avaliação foi registrada nesta simulação.
          </p>
          {tip > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-card p-3 text-sm">
              <p className="font-semibold">Gorjeta extra de {money(tip)} simulada.</p>
            </div>
          )}
          {demo.closedAt ? (
            <Button
              onClick={() => setStage("closed")}
              className="mt-8 h-12 w-full font-display text-base"
            >
              Ver mesa encerrada <ChevronRight />
            </Button>
          ) : (
            <Button
              onClick={() => setStage("bill")}
              className="mt-8 h-12 w-full font-display text-base"
            >
              Voltar à mesa
            </Button>
          )}
        </Centered>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`flex justify-between gap-4 ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}

function PaymentScreen<M extends Method | Exclude<Method, "at_establishment">>({
  extra,
  title,
  description,
  value,
  method,
  setMethod,
  terms,
  setTerms,
  back,
  pay,
  allowEstablishment = false,
  establishmentMethod,
  setEstablishmentMethod,
  cashReceived = "",
  setCashReceived,
}: {
  extra?: React.ReactNode;
  title: string;
  description: string;
  value: number;
  method: M | null;
  setMethod: (method: M) => void;
  terms: boolean;
  setTerms: (value: boolean) => void;
  back: () => void;
  pay: () => void;
  allowEstablishment?: boolean;
  establishmentMethod?: EstablishmentMethod | null;
  setEstablishmentMethod?: (method: EstablishmentMethod | null) => void;
  cashReceived?: string;
  setCashReceived?: (value: string) => void;
}) {
  // Carteiras digitais ainda não estão ativas no produto real: aparecem como "Em breve", sem seleção.
  const methods = (Object.keys(METHOD_DETAILS) as Method[]).filter(
    (item) => allowEstablishment || item !== "at_establishment",
  ) as M[];
  const cash = Number(cashReceived.replace(",", "."));
  const establishmentInvalid =
    method === "at_establishment" &&
    (!establishmentMethod || (establishmentMethod === "cash" && cash < value));
  return (
    <main className="flex flex-1 flex-col px-5 pb-8">
      <Button variant="ghost" onClick={back} className="mb-4 w-fit px-2 text-muted-foreground">
        <ArrowLeft /> Voltar
      </Button>
      <h1 className="font-display text-[1.65rem] font-semibold leading-tight tracking-heading">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="my-6 rounded-3xl bg-secondary px-5 py-6 text-center text-secondary-foreground">
        <p className="text-xs text-secondary-foreground/65">Total</p>
        <p className="money mt-1 font-display text-[2.4rem] font-semibold leading-none tracking-heading">
          {money(value)}
        </p>
        {extra}
      </div>
      <h2 className="text-sm font-semibold">Como deseja pagar?</h2>
      <div className="mt-3 flex flex-col gap-2">
        {methods.map((item) => {
          const detail = METHOD_DETAILS[item];
          const selected = method === item;
          return (
            <Button
              key={item}
              variant="outline"
              onClick={() => {
                setMethod(item);
                if (item !== "at_establishment") setEstablishmentMethod?.(null);
              }}
              className={`h-auto min-h-16 justify-start whitespace-normal rounded-2xl px-4 py-3.5 text-left shadow-none transition-colors ${selected ? "border-primary bg-brand-soft/40 ring-1 ring-primary" : "bg-card"}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground"}`}
              >
                <detail.Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{detail.label}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {detail.description}
                </span>
              </span>
              {selected ? (
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary"
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
              ) : (
                <span
                  className="h-5 w-5 shrink-0 rounded-full border-2 border-input"
                  aria-hidden="true"
                />
              )}
            </Button>
          );
        })}
      </div>
      {method === "at_establishment" && allowEstablishment && setEstablishmentMethod && (
        <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
          <h3 className="text-sm font-semibold">Como você pagará?</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={establishmentMethod === "cash" ? "default" : "outline"}
              onClick={() => setEstablishmentMethod("cash")}
              className="h-11 rounded-full"
            >
              Dinheiro
            </Button>
            <Button
              type="button"
              variant={establishmentMethod === "card_terminal" ? "default" : "outline"}
              onClick={() => setEstablishmentMethod("card_terminal")}
              className="h-11 rounded-full"
            >
              Maquininha
            </Button>
          </div>
          {establishmentMethod === "cash" && setCashReceived && (
            <div className="mt-4">
              <label htmlFor="demo-cash" className="text-sm font-semibold">
                Quanto você entregará?
              </label>
              <Input
                id="demo-cash"
                type="number"
                inputMode="decimal"
                min={value}
                step="0.01"
                value={cashReceived}
                onChange={(event) => setCashReceived(event.target.value)}
                placeholder={money(value)}
                className="mt-2 h-12 bg-card"
              />
              {cash >= value && (
                <p className="mt-2 text-sm font-semibold text-primary">
                  Troco: {money(Math.round((cash - value) * 100) / 100)}
                </p>
              )}
            </div>
          )}
          {establishmentMethod && (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {establishmentMethod === "cash"
                ? "Prepare o dinheiro. O garçom tratará do seu troco em breve."
                : "O garçom irá em instantes até sua mesa com a maquininha."}
            </p>
          )}
        </div>
      )}
      {allowEstablishment && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <Checkbox
            id="demo-terms"
            checked={terms}
            onCheckedChange={(checked) => setTerms(checked === true)}
            className="mt-0.5 h-5 w-5"
          />
          <label htmlFor="demo-terms" className="text-xs leading-5 text-muted-foreground">
            Confirmo que revisei os itens selecionados e entendo que este é um pagamento simulado.
          </label>
        </div>
      )}
      <Button
        disabled={!method || !terms || establishmentInvalid}
        onClick={pay}
        className="mt-6 h-12 font-display text-base"
      >
        Simular pagamento de {money(value)}
      </Button>
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        Ao continuar, você concorda com os{" "}
        <Link
          to="/legal/$livro"
          params={{ livro: "termos-de-uso" }}
          target="_blank"
          className="underline underline-offset-2"
        >
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link
          to="/legal/$livro"
          params={{ livro: "privacidade" }}
          target="_blank"
          className="underline underline-offset-2"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
      {children}
    </main>
  );
}
