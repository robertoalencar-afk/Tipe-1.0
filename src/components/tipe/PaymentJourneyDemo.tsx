import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@/components/tipe/ds";
import { ScreenBill, ScreenDone, ScreenPay, ScreenTip } from "@/components/tipe/landing/ProductScreens";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "conta", label: "Conta", Screen: ScreenBill },
  { id: "pagamento", label: "Pagamento", Screen: ScreenPay },
  { id: "pronto", label: "Pronto", Screen: ScreenDone },
  { id: "gorjeta", label: "Gorjeta", Screen: ScreenTip },
] as const;

/**
 * Demonstração da jornada do cliente em um celular. Avança sozinha enquanto
 * está visível (pausa ao interagir e com movimento reduzido). Dados fictícios.
 */
export function PaymentJourneyDemo({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setAuto(false);
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !visible) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), 2800);
    return () => window.clearTimeout(t);
  }, [auto, visible, step]);

  return (
    <div ref={root} className={cn("mx-auto w-full max-w-[300px]", className)}>
      <PhoneFrame>
        <div className="relative aspect-[300/620]" aria-live="polite" aria-label={`Demonstração: ${STEPS[step]!.label}`}>
          {STEPS.map(({ id, Screen }, i) => (
            <div key={id} aria-hidden={i !== step} className={cn("absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none", i === step ? "opacity-100" : "pointer-events-none opacity-0")}>
              <Screen />
            </div>
          ))}
        </div>
      </PhoneFrame>
      <div className="mt-6 flex justify-center gap-1 rounded-full border border-border bg-surface p-1 shadow-xs" role="tablist" aria-label="Etapas da demonstração">
        {STEPS.map(({ id, label }, i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={i === step}
            onClick={() => { setAuto(false); setStep(i); }}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", i === step ? "bg-ink text-white" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
