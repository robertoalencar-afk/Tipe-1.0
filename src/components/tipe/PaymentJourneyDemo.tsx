import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, CreditCard, RotateCcw, Smartphone, Wallet } from "lucide-react";
import logo from "@/assets/logo-dark.png.asset.json";
import { Button } from "@/components/ui/button";

type DemoStep = "items" | "payment" | "approved";

const items = [
  { id: "moqueca", name: "Moqueca de peixe", detail: "1 porção", price: 89.9 },
  { id: "caipirinha", name: "Caipirinha", detail: "1 de 2", price: 22 },
  { id: "agua", name: "Água com gás", detail: "1 unidade", price: 7.5 },
] as const;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function PaymentJourneyDemo() {
  const [step, setStep] = useState<DemoStep>("items");
  const [selected, setSelected] = useState<string[]>([]);
  const [autoplay, setAutoplay] = useState(true);

  const subtotal = useMemo(
    () => items.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.price, 0),
    [selected],
  );
  const total = subtotal * 1.1;

  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || !visible) return;
    const sequence = [
      window.setTimeout(() => setSelected(["moqueca"]), 500),
      window.setTimeout(() => setSelected(["moqueca", "caipirinha"]), 1100),
      window.setTimeout(() => setStep("payment"), 2100),
      window.setTimeout(() => setStep("approved"), 3700),
      window.setTimeout(() => {
        setSelected([]);
        setStep("items");
      }, 6200),
    ];
    return () => sequence.forEach(window.clearTimeout);
  }, [autoplay, visible, step === "items" && selected.length === 0]);

  const toggleItem = (id: string) => {
    setAutoplay(false);
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const restart = () => {
    setAutoplay(true);
    setSelected([]);
    setStep("items");
  };

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[390px]" aria-label="Demonstração do pagamento pelo aplicativo TIPE">
      <div className="absolute inset-x-8 bottom-[-1.25rem] h-16 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2.75rem] border-[8px] border-secondary bg-card text-card-foreground shadow-2xl">
        <div className="relative min-h-[590px] p-5 pb-6">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-muted" />
          <div className="flex items-center justify-between">
            <img src={logo.url} alt="TIPE" className="h-6 w-auto" />
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-foreground">Mesa 12</span>
          </div>

          <div className="mt-5 flex items-center gap-2" aria-hidden>
            {["items", "payment", "approved"].map((value, index) => {
              const active = ["items", "payment", "approved"].indexOf(step) >= index;
              return <span key={value} className={`h-1.5 flex-1 rounded-full ${active ? "bg-primary" : "bg-muted"}`} />;
            })}
          </div>

          {step === "items" && (
            <div className="tipe-demo-scene">
              <p className="mt-5 font-display text-lg font-extrabold">Olá, Ana. O que você vai pagar?</p>
              <p className="mt-1 text-xs text-muted-foreground">Toque nos itens para selecionar</p>
              <div className="mt-4 space-y-2.5">
                {items.map((item) => {
                  const active = selected.includes(item.id);
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="outline"
                      onClick={() => toggleItem(item.id)}
                      className={`h-auto w-full justify-between rounded-2xl px-3.5 py-3 text-left ${active ? "border-primary bg-primary/10" : "bg-background"}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {active && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0"><span className="block truncate text-xs font-bold">{item.name}</span><span className="block text-[10px] font-normal text-muted-foreground">{item.detail}</span></span>
                      </span>
                      <span className="shrink-0 text-xs font-extrabold">{formatMoney(item.price)}</span>
                    </Button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl bg-muted/60 p-3.5">
                <div className="flex justify-between text-[11px] text-muted-foreground"><span>Itens escolhidos</span><span>{formatMoney(subtotal)}</span></div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>Serviço</span><span>{formatMoney(subtotal * 0.1)}</span></div>
                <div className="mt-2 flex justify-between border-t pt-2 font-display text-base font-extrabold"><span>Total</span><span className="tipe-value-update">{formatMoney(total)}</span></div>
              </div>
              <Button type="button" disabled={!selected.length} onClick={() => { setAutoplay(false); setStep("payment"); }} className="mt-4 h-11 w-full rounded-full font-display font-bold">
                Continuar com {formatMoney(total)}
              </Button>
            </div>
          )}

          {step === "payment" && (
            <div className="tipe-demo-scene">
              <p className="mt-5 font-display text-lg font-extrabold">Como você quer pagar?</p>
              <p className="mt-1 text-xs text-muted-foreground">Total desta parte da conta: {formatMoney(total || 123.09)}</p>
              <div className="mt-5 space-y-3">
                <div className="tipe-wallet-select flex items-center justify-between rounded-2xl border-2 border-primary bg-primary/10 p-4">
                  <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Wallet className="h-4 w-4" /></span><span><span className="block text-sm font-extrabold">Apple Pay</span><span className="block text-[10px] text-muted-foreground">Pague com a carteira do celular</span></span></span>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary"><Check className="h-3 w-3 text-primary-foreground" /></span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border bg-background p-4 opacity-65">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><Wallet className="h-4 w-4" /></span>
                  <span><span className="block text-sm font-bold">Google Pay</span><span className="block text-[10px] text-muted-foreground">Carteira do seu Android</span></span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border bg-background p-4 opacity-65">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><Smartphone className="h-4 w-4" /></span>
                  <span className="text-sm font-bold">Pix</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border bg-background p-4 opacity-65">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted"><CreditCard className="h-4 w-4" /></span>
                  <span><span className="block text-sm font-bold">No estabelecimento</span><span className="block text-[10px] text-muted-foreground">Dinheiro ou maquininha</span></span>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-secondary p-3 text-center text-secondary-foreground">
                <p className="text-[10px] opacity-70">Confirme no seu celular</p>
                <p className="mt-0.5 font-display text-base font-extrabold">Pagar com Apple Pay</p>
              </div>
            </div>
          )}

          {step === "approved" && (
            <div className="tipe-demo-scene flex min-h-[450px] flex-col items-center justify-center text-center">
              <div className="tipe-approved-mark grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground"><CheckCircle2 className="h-10 w-10" /></div>
              <p className="mt-6 font-display text-2xl font-extrabold">Pagamento aprovado</p>
              <p className="mt-2 max-w-[250px] text-sm text-muted-foreground">Os itens já saíram da sua parte da conta. Agora é só aproveitar.</p>
              <div className="mt-6 w-full rounded-2xl bg-muted/60 p-4 text-left">
                <div className="flex justify-between text-xs"><span>Apple Pay</span><span className="font-bold">{formatMoney(total || 123.09)}</span></div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Mesa 12</span><span>Agora</span></div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={restart} className="mt-5"><RotateCcw className="h-4 w-4" />Ver novamente</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}