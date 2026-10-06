import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, QrCode, Star, Utensils, Wine, Coffee, Pizza } from "lucide-react";

type Scene = { words: string[]; accent: number[]; ms: number; visual: () => React.ReactNode };

function Words({ words, accent }: { words: string[]; accent: number[] }) {
  return (
    <h2 className="font-display text-[2.6rem] font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
      {words.map((w, i) => (
        <span key={i} className="mv-word relative block" style={{ animationDelay: `${120 + i * 160}ms` }}>
          <span aria-hidden className="mv-echo absolute inset-0 text-primary/25" style={{ animationDelay: `${120 + i * 160}ms` }}>{w}</span>
          <span className={accent.includes(i) ? "relative text-primary" : "relative"}>{w}</span>
        </span>
      ))}
    </h2>
  );
}

function Ring({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mv-glow text-primary">
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" className="mv-draw" pathLength={1} />
      <path d="M32 30 L50 52 L68 30 M50 52 L50 74" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="mv-draw" pathLength={1} style={{ animationDelay: "500ms" }} />
    </svg>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mv-rise relative mx-auto w-[210px] rounded-[2.2rem] border border-secondary-foreground/15 bg-secondary p-2.5 shadow-2xl sm:w-[240px]">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-secondary-foreground/15" />
      <div className="overflow-hidden rounded-[1.7rem] bg-secondary-foreground/[0.04] p-3.5">{children}</div>
    </div>
  );
}

const items = [["Moqueca de peixe", "89,00"], ["Caipirinha x2", "38,00"], ["Água com gás", "7,90"], ["Pudim", "18,00"]];
const people = [["A", "Ana", "-left-2 top-6"], ["C", "Carlos", "right-0 top-2"], ["P", "Pedro", "-left-4 bottom-10"], ["J", "Júlia", "right-2 bottom-4"]];

const scenes: Scene[] = [
  {
    words: ["A mesa", "ganhou", "vida."], accent: [2], ms: 4200,
    visual: () => (
      <div className="relative mx-auto aspect-square w-[280px] sm:w-[360px]">
        <div className="mv-spin-slow absolute inset-0 rounded-full border border-dashed border-primary/30" />
        <div className="mv-pop absolute inset-8 rounded-full bg-secondary-foreground/[0.06] shadow-inner" />
        {[Utensils, Wine, Coffee, Pizza, Utensils, Wine].map((Icon, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <div key={i} className="mv-pop absolute flex h-12 w-12 items-center justify-center rounded-full bg-secondary-foreground/10 text-primary" style={{ left: `calc(50% + ${Math.cos(a) * 38}% - 24px)`, top: `calc(50% + ${Math.sin(a) * 38}% - 24px)`, animationDelay: `${300 + i * 110}ms` }}>
              <Icon className="h-5 w-5" />
            </div>
          );
        })}
        <div className="mv-pop absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl" style={{ animationDelay: "900ms" }}>
          <QrCode className="h-10 w-10" />
          <span className="mt-1 text-[10px] font-bold">MESA 12</span>
          <span className="mv-scan absolute inset-x-2 h-0.5 rounded bg-primary-foreground/70" />
        </div>
      </div>
    ),
  },
  {
    words: ["A conta", "chega no", "celular."], accent: [2], ms: 4600,
    visual: () => (
      <Phone>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Mesa 12 · Maré Alta</p>
        <p className="mt-1 font-display text-lg font-bold">Sua conta</p>
        <div className="mt-3 space-y-2">
          {items.map(([n, v], i) => (
            <div key={n} className="mv-slide flex items-center justify-between rounded-xl bg-secondary-foreground/[0.07] px-3 py-2.5 text-xs" style={{ animationDelay: `${400 + i * 220}ms` }}>
              <span>{n}</span><span className="font-semibold">R$ {v}</span>
            </div>
          ))}
        </div>
        <div className="mv-slide mt-3 flex justify-between border-t border-secondary-foreground/10 pt-3 text-sm font-bold" style={{ animationDelay: "1400ms" }}>
          <span>Total</span><span className="text-primary">R$ 152,90</span>
        </div>
      </Phone>
    ),
  },
  {
    words: ["Divida", "do seu", "jeito."], accent: [2], ms: 4600,
    visual: () => (
      <div className="relative mx-auto h-[300px] w-[300px] sm:h-[360px] sm:w-[380px]">
        <div className="mv-pop absolute left-1/2 top-1/2 w-48 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-secondary-foreground/[0.08] p-4 shadow-2xl sm:w-56" style={{ animationDelay: "250ms" }}>
          <div className="h-24 rounded-2xl" style={{ background: "radial-gradient(circle at 30% 30%, var(--primary), transparent 70%)" }} />
          <p className="mt-3 font-display font-bold">Moqueca de peixe</p>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2].map((i) => <span key={i} className="mv-fill h-1.5 flex-1 rounded-full bg-primary" style={{ animationDelay: `${900 + i * 300}ms` }} />)}
          </div>
          <p className="mv-slide mt-2 text-xs text-primary" style={{ animationDelay: "1900ms" }}>÷ 3 pessoas · R$ 29,67 cada</p>
        </div>
        {people.map(([l, n, pos], i) => (
          <div key={n} className={`mv-float absolute ${pos} flex flex-col items-center`} style={{ animationDelay: `${i * 400}ms` }}>
            <span className="mv-pop flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 font-display text-lg font-bold text-primary ring-2 ring-primary/40" style={{ animationDelay: `${500 + i * 180}ms` }}>{l}</span>
            <span className="mt-1 text-[11px] opacity-70">{n}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    words: ["Pague.", "Sem", "esperar."], accent: [1, 2], ms: 4600,
    visual: () => (
      <Phone>
        <p className="font-display text-lg font-bold">Pagar R$ 29,67</p>
        <div className="mt-3 space-y-2">
          {["Pix", "Apple Pay", "Google Pay"].map((m, i) => (
            <div key={m} className={`mv-slide rounded-xl px-3 py-3 text-sm font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary-foreground/[0.07]"}`} style={{ animationDelay: `${300 + i * 180}ms` }}>{m}</div>
          ))}
        </div>
        <div className="relative mt-5 flex h-24 items-center justify-center">
          <span className="mv-ripple absolute h-16 w-16 rounded-full border-2 border-primary" style={{ animationDelay: "1500ms" }} />
          <span className="mv-ripple absolute h-16 w-16 rounded-full border-2 border-primary" style={{ animationDelay: "1900ms" }} />
          <span className="mv-pop flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground" style={{ animationDelay: "1300ms" }}><Check className="h-8 w-8" /></span>
        </div>
        <p className="mv-slide text-center text-xs font-semibold text-primary" style={{ animationDelay: "1700ms" }}>Pagamento aprovado</p>
      </Phone>
    ),
  },
  {
    words: ["O garçom", "sente o", "carinho."], accent: [2], ms: 4400,
    visual: () => (
      <div className="mv-rise mx-auto w-[260px] rounded-3xl bg-secondary-foreground/[0.07] p-5 shadow-2xl sm:w-[300px]">
        <p className="text-xs uppercase tracking-widest opacity-60">Atendido por</p>
        <p className="font-display text-xl font-bold">Rafael</p>
        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="mv-pop h-7 w-7 fill-primary text-primary" style={{ animationDelay: `${400 + i * 140}ms` }} />)}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["R$ 5", "R$ 10", "R$ 15"].map((v, i) => (
            <span key={v} className={`mv-slide rounded-xl py-2.5 text-center text-sm font-bold ${i === 1 ? "bg-primary text-primary-foreground" : "bg-secondary-foreground/10"}`} style={{ animationDelay: `${1200 + i * 150}ms` }}>{v}</span>
          ))}
        </div>
        <p className="mv-slide mt-4 text-sm text-primary" style={{ animationDelay: "1900ms" }}>Obrigado pela gorjeta extra!</p>
      </div>
    ),
  },
  {
    words: ["TIPE.", "Pague.", "Sem esperar."], accent: [0, 2], ms: 5200,
    visual: () => (
      <div className="flex flex-col items-center">
        <Ring size={200} />
        <div className="mv-slide mt-6 flex flex-wrap justify-center gap-3" style={{ animationDelay: "1300ms" }}>
          <a href="#lista-de-espera" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground">Lista de espera <ChevronRight className="h-4 w-4" /></a>
          <Link to="/simulador" className="inline-flex items-center rounded-full border border-secondary-foreground/25 px-6 py-3 font-display font-semibold">Simular</Link>
        </div>
      </div>
    ),
  },
];

export function MesaViva() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((v) => (v + 1) % scenes.length), scenes[i]!.ms);
    return () => clearTimeout(t);
  }, [i, paused]);
  const s = scenes[i]!;
  return (
    <section aria-label="Como a TIPE funciona" className="relative overflow-hidden bg-secondary text-secondary-foreground" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div aria-hidden key={`g${i}`} className="mv-aura pointer-events-none absolute -right-32 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div key={i} className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-8 px-5 py-12 sm:px-6 lg:min-h-[600px] lg:grid-cols-[1fr_1fr] lg:py-16">
        <div className="min-h-[170px] sm:min-h-[220px]"><Words words={s.words} accent={s.accent} /></div>
        <div className="flex min-h-[340px] items-center justify-center">{s.visual()}</div>
      </div>
      <div className="absolute inset-x-0 bottom-5 mx-auto flex max-w-7xl gap-1.5 px-5 sm:px-6">
        {scenes.map((sc, n) => (
          <button key={n} aria-label={`Cena ${n + 1}`} onClick={() => setI(n)} className="h-1 flex-1 overflow-hidden rounded-full bg-secondary-foreground/15">
            <span className={`block h-full bg-primary ${n < i ? "w-full" : n === i ? "mv-progress" : "w-0"}`} style={n === i ? { animationDuration: `${sc.ms}ms`, animationPlayState: paused ? "paused" : "running" } : undefined} />
          </button>
        ))}
      </div>
    </section>
  );
}
