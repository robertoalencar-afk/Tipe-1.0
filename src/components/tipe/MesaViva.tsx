import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import wordmark from "@/assets/tipe-wordmark-light.png.asset.json";
import roundLogo from "@/assets/tipe-logo-redondo.png.asset.json";
import { Check, ChevronRight, QrCode, Star, Heart, Utensils, Wine, Coffee, Plus } from "lucide-react";

type Word = [string, boolean?];

/** Headline with two echo layers that trail behind the reveal, like the reference motion. */
function Headline({ lines, className = "" }: { lines: Word[][]; className?: string }) {
  const body = (echo?: string) =>
    lines.map((line, li) => (
      <span key={li} className="block">
        {line.map(([w, accent], wi) => (
          <span key={wi} className={`w inline-block will-change-transform ${accent && !echo ? "text-primary" : ""}`}>
            {w}
            {wi < line.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </span>
    ));
  return (
    <h2 className={`relative font-display text-[2.6rem] font-extrabold leading-[1] tracking-tight sm:text-6xl lg:text-[5.2rem] ${className}`}>
      <span aria-hidden className="e e2 pointer-events-none absolute inset-0 text-primary/15">{body("e")}</span>
      <span aria-hidden className="e e1 pointer-events-none absolute inset-0 text-secondary-foreground/30">{body("e")}</span>
      <span className="relative">{body()}</span>
    </h2>
  );
}

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`phone relative w-[205px] shrink-0 rounded-[2.2rem] border border-secondary-foreground/10 bg-mv-surface p-3 shadow-2xl sm:w-[240px] lg:w-[270px] ${className}`}>
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-secondary-foreground/15" />
      {children}
    </div>
  );
}

const bill = [["Moqueca de peixe", "89,00"], ["Caipirinha x2", "38,00"], ["Água com gás", "7,90"], ["Pudim", "18,00"]];
const cards = [
  ["Moqueca de peixe", "R$ 89,00", "radial-gradient(circle at 30% 30%, var(--primary), transparent 75%)"],
  ["Camarão alho e óleo", "R$ 64,00", "radial-gradient(circle at 70% 30%, var(--primary), transparent 65%)"],
  ["Caipirinha", "R$ 19,00", "radial-gradient(circle at 50% 80%, var(--primary), transparent 70%)"],
  ["Casquinha de siri", "R$ 32,00", "radial-gradient(circle at 20% 70%, var(--primary), transparent 70%)"],
  ["Pudim da casa", "R$ 18,00", "radial-gradient(circle at 80% 80%, var(--primary), transparent 70%)"],
  ["Água com gás", "R$ 7,90", "radial-gradient(circle at 40% 20%, var(--primary), transparent 70%)"],
];
const group = [["A", "Ana", "Moqueca ÷ 3"], ["C", "Carlos", "Moqueca ÷ 3 · Caipirinha"], ["P", "Pedro", "Moqueca ÷ 3 · Pudim"]];

export function MesaViva() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let io: IntersectionObserver | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled || !root.current) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);
        gsap.set(q(".layer"), { autoAlpha: 0 });
        if (reduce) {
          gsap.set(q(".s6"), { autoAlpha: 1 });
          return;
        }
        const tl = gsap.timeline({
          repeat: -1,
          defaults: { ease: "expo.out" },
          onUpdate: () => { if (bar.current) bar.current.style.transform = `scaleX(${tl.progress()})`; },
        });

        const enter = (s: string, at: number) => {
          tl.set(q(s), { autoAlpha: 1, y: 0, filter: "blur(0px)" }, at);
          tl.from(q(`${s} > div > h2 > span:last-child .w`), { yPercent: 120, opacity: 0, filter: "blur(14px)", stagger: 0.11, duration: 0.8 }, at + 0.05);
          tl.fromTo(q(`${s} .e1`), { x: -26, opacity: 1 }, { x: 0, opacity: 0, duration: 1.1, ease: "power3.out" }, at + 0.15);
          tl.fromTo(q(`${s} .e2`), { x: -52, opacity: 1 }, { x: 0, opacity: 0, duration: 1.3, ease: "power3.out" }, at + 0.2);
          tl.from(q(`${s} .e .w`), { yPercent: 120, stagger: 0.11, duration: 0.8 }, at + 0.15);
        };
        const exit = (s: string, at: number) =>
          tl.to(q(s), { autoAlpha: 0, y: -50, filter: "blur(12px)", duration: 0.45, ease: "power2.in" }, at);

        // 0 · logo opening
        tl.set(q(".s0"), { autoAlpha: 1 }, 0);
        tl.fromTo(q(".s0 .wm"), { clipPath: "inset(0 100% 0 0)", scale: 0.92, filter: "blur(10px)" }, { clipPath: "inset(0 0% 0 0)", scale: 1, filter: "blur(0px)", duration: 1.4, ease: "expo.inOut" }, 0.2);
        tl.to(q(".s0 .wm"), { scale: 1.05, duration: 1.4, ease: "sine.inOut" }, 1.6);
        exit(".s0", 3.3);

        // 1 · scan the table
        let t = 3.6;
        enter(".s1", t);
        tl.from(q(".s1 .phone"), { x: 160, rotate: 10, opacity: 0, duration: 1 }, t + 0.2);
        tl.from(q(".s1 .qr"), { scale: 0.3, opacity: 0, duration: 0.6, ease: "back.out(2)" }, t + 0.6);
        tl.fromTo(q(".s1 .scan"), { top: "10%" }, { top: "85%", duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 1 }, t + 1);
        tl.to(q(".s1 .qrbox"), { height: 0, opacity: 0, marginBottom: 0, duration: 0.5, ease: "power3.inOut" }, t + 2.4);
        tl.from(q(".s1 .row"), { x: 40, opacity: 0, stagger: 0.12, duration: 0.5 }, t + 2.6);
        exit(".s1", t + 4.4);

        // 2 · live bill carousel
        t = 8.3;
        enter(".s2", t);
        tl.from(q(".s2 .card"), { x: 260, opacity: 0, stagger: 0.09, duration: 0.9 }, t + 0.35);
        tl.to(q(".s2 .track"), { xPercent: -18, duration: 4, ease: "none" }, t + 0.4);
        tl.from(q(".s2 .play"), { scale: 0, duration: 0.5, ease: "back.out(3)" }, t + 1.6);
        exit(".s2", t + 4.3);

        // 3 · split with the table
        t = 12.9;
        enter(".s3", t);
        tl.from(q(".s3 .phone"), { y: 180, opacity: 0, duration: 1 }, t + 0.1);
        tl.from(q(".s3 .av"), { scale: 0, stagger: 0.1, duration: 0.5, ease: "back.out(2.5)" }, t + 0.6);
        tl.from(q(".s3 .row"), { x: -30, opacity: 0, stagger: 0.14, duration: 0.5 }, t + 0.9);
        tl.from(q(".s3 .side"), { scale: 0, opacity: 0, stagger: 0.08, duration: 0.4, ease: "back.out(3)" }, t + 1.1);
        tl.from(q(".s3 .toast"), { y: 30, opacity: 0, duration: 0.5 }, t + 2.2);
        exit(".s3", t + 4.4);

        // 4 · pay in seconds
        t = 17.6;
        enter(".s4", t);
        tl.from(q(".s4 .paycard"), { y: 90, opacity: 0, duration: 0.9 }, t + 0.2);
        tl.from(q(".s4 .bub"), { x: 90, opacity: 0, stagger: 0.25, duration: 0.6 }, t + 0.5);
        tl.from(q(".s4 .wb"), { scaleY: 0.1, stagger: { each: 0.015, from: "start" }, duration: 0.4 }, t + 0.7);
        tl.to(q(".s4 .wb"), { opacity: 1, stagger: 0.02, duration: 0.1 }, t + 1.3);
        tl.from(q(".s4 .ok"), { scale: 0, rotate: -90, duration: 0.6, ease: "back.out(2.5)" }, t + 2.4);
        tl.from(q(".s4 .okt"), { opacity: 0, x: -10, duration: 0.4 }, t + 2.7);
        exit(".s4", t + 4.4);

        // 5 · waiter thanks
        t = 22.3;
        enter(".s5", t);
        tl.from(q(".s5 .tipcard"), { x: 140, rotate: 6, opacity: 0, duration: 0.9 }, t + 0.2);
        tl.from(q(".s5 .st"), { scale: 0, rotate: -120, stagger: 0.1, duration: 0.5, ease: "back.out(3)" }, t + 0.7);
        tl.from(q(".s5 .tip"), { y: 20, opacity: 0, stagger: 0.1, duration: 0.4 }, t + 1.3);
        tl.fromTo(q(".s5 .tip-on"), { scale: 1 }, { scale: 1.12, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, t + 2);
        tl.from(q(".s5 .heart"), { y: 0, opacity: 0, scale: 0.4, stagger: 0.15, duration: 0.6 }, t + 2.1);
        tl.to(q(".s5 .heart"), { y: -90, opacity: 0, stagger: 0.15, duration: 1.4, ease: "power1.out" }, t + 2.5);
        exit(".s5", t + 4.2);

        // 6 · elements form the logo + tagline
        t = 26.8;
        tl.set(q(".s6"), { autoAlpha: 1 }, t);
        tl.from(q(".s6 .pt"), {
          x: () => gsap.utils.random(-520, 520), y: () => gsap.utils.random(-320, 320),
          scale: () => gsap.utils.random(0.5, 2.2), opacity: 0, duration: 1, ease: "power3.in", stagger: 0.02,
        }, t);
        tl.to(q(".s6 .pt"), { scale: 0, opacity: 0, duration: 0.25 }, t + 1.15);
        tl.from(q(".s6 .logo"), { scale: 0, rotate: -180, opacity: 0, duration: 1, ease: "back.out(1.6)" }, t + 1.05);
        tl.from(q(".s6 .w"), { yPercent: 120, opacity: 0, filter: "blur(12px)", stagger: 0.1, duration: 0.8 }, t + 1.6);
        tl.from(q(".s6 .line"), { scaleX: 0, duration: 1.6, ease: "power2.inOut" }, t + 2.1);
        tl.from(q(".s6 .dot"), { left: "-5px", duration: 1.6, ease: "power2.inOut" }, t + 2.1);
        tl.from(q(".s6 .cta"), { y: 20, opacity: 0, duration: 0.6 }, t + 2.6);
        tl.to(q(".s6"), { autoAlpha: 0, filter: "blur(10px)", duration: 0.5, ease: "power2.in" }, t + 6.2);

        io = new IntersectionObserver(([e]) => (e!.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.05 });
        io.observe(root.current!);
      }, root);
    })();
    return () => { cancelled = true; io?.disconnect(); ctx?.revert(); };
  }, []);

  const split = "layer absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 pb-10 lg:flex-row lg:gap-20 lg:px-16";

  return (
    <section aria-label="Como a TIPE funciona" className="relative overflow-hidden bg-mv-stage text-secondary-foreground">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-3xl" />
      <div ref={root} className="relative mx-auto h-[660px] max-w-7xl sm:h-[700px] lg:h-[min(84vh,720px)]">
        {/* 0 */}
        <div className="layer s0 absolute inset-0 flex items-center justify-center px-8">
          <img src={wordmark.url} alt="TIPE" className="wm w-[min(70vw,460px)]" />
        </div>

        {/* 1 */}
        <div className={`${split} s1`}>
          <div className="lg:w-[48%]"><Headline lines={[[["A"], ["mesa"]], [["chama"], ["a"]], [["conta.", true]]]} /></div>
          <Phone>
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Mesa 12 · Maré Alta</p>
            <div className="qrbox relative mx-auto my-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
              <QrCode className="qr h-24 w-24 text-primary" />
              <span className="scan absolute inset-x-3 h-0.5 rounded bg-primary shadow-[0_0_12px_var(--primary)]" />
            </div>
            <div className="space-y-2">
              {bill.map(([n, v]) => (
                <div key={n} className="row flex justify-between rounded-xl bg-secondary-foreground/[0.06] px-3 py-2.5 text-xs"><span>{n}</span><span className="font-semibold">R$ {v}</span></div>
              ))}
              <div className="row flex justify-between px-1 pt-1 text-sm font-bold"><span>Total</span><span className="text-primary">R$ 152,90</span></div>
            </div>
          </Phone>
        </div>

        {/* 2 */}
        <div className="layer s2 absolute inset-0 flex flex-col justify-center gap-10 px-6 pb-10 lg:px-16">
          <div><Headline lines={[[["Sua"], ["conta,"]], [["ao", true], ["vivo.", true]]]} /></div>
          <div>
            <div className="mb-3 flex items-center justify-between text-sm font-semibold"><span>Na sua mesa agora</span><span className="text-xs opacity-50">Mesa 12</span></div>
            <div className="track flex gap-4">
              {cards.map(([n, p, g], i) => (
                <div key={n} className="card w-[150px] shrink-0 rounded-2xl bg-mv-surface p-3 sm:w-[190px]">
                  <div className="relative aspect-square rounded-xl" style={{ background: g }}>
                    {i === 0 && <span className="play absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"><Plus className="h-5 w-5" /></span>}
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold">{n}</p>
                  <p className="text-xs opacity-55">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3 */}
        <div className={`${split} s3 lg:flex-row-reverse`}>
          <div className="lg:w-[46%]"><Headline lines={[[["Divida"]], [["o"], ["momento.", true]]]} /></div>
          <div className="flex items-center gap-4">
            <Phone>
              <p className="font-display text-base font-bold">Mesa 12</p>
              <p className="text-[10px] opacity-50">3 pessoas pagando juntas</p>
              <div className="mt-3 flex -space-x-2">
                {group.map(([l]) => <span key={l} className="av flex h-9 w-9 items-center justify-center rounded-full bg-primary/25 text-sm font-bold text-primary ring-2 ring-mv-surface">{l}</span>)}
              </div>
              <div className="mt-4 space-y-2">
                {group.map(([l, n, d]) => (
                  <div key={n} className="row flex items-center gap-3 rounded-xl bg-secondary-foreground/[0.06] p-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">{l}</span>
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{n}</p><p className="truncate text-[10px] opacity-55">{d}</p></div>
                  </div>
                ))}
              </div>
              <div className="toast mt-3 rounded-xl bg-secondary-foreground/[0.08] px-3 py-2 text-[11px]">Júlia entrou na mesa</div>
              <div className="mt-3 rounded-full bg-primary py-2.5 text-center text-xs font-bold text-primary-foreground">+ Escolher meus itens</div>
            </Phone>
            <div className="hidden flex-col gap-3 sm:flex">
              {[Utensils, Wine, Star, Coffee, Heart].map((I, i) => <span key={i} className="side flex h-10 w-10 items-center justify-center rounded-full bg-mv-surface text-primary"><I className="h-4 w-4" /></span>)}
            </div>
          </div>
        </div>

        {/* 4 */}
        <div className="layer s4 absolute inset-0 flex flex-col justify-center gap-8 px-6 pb-10 lg:px-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <Headline lines={[[["Pague"], ["em"]], [["segundos.", true]]]} />
            <div className="hidden w-[340px] flex-col gap-3 sm:flex">
              <div className="bub ml-auto flex w-[300px] items-center gap-3 rounded-2xl bg-mv-surface p-3 text-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/25 text-xs font-bold text-primary">A</span><span>Paguei minha parte!</span></div>
              <div className="bub ml-auto flex w-[280px] items-center gap-3 rounded-2xl bg-mv-surface p-3 text-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/25 text-xs font-bold text-primary">C</span><span>Já foi também, fácil demais.</span></div>
            </div>
          </div>
          <div className="paycard flex flex-col gap-5 rounded-3xl bg-mv-surface p-5 sm:flex-row sm:items-center">
            <div className="flex h-28 w-full shrink-0 flex-col justify-end rounded-2xl p-4 sm:h-36 sm:w-44" style={{ background: "radial-gradient(circle at 25% 20%, var(--primary), transparent 80%)" }}>
              <p className="font-display text-lg font-extrabold leading-tight">MESA 12</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] opacity-55">Sua parte · Moqueca ÷ 3 + Caipirinha</p>
              <p className="font-display text-2xl font-bold">R$ 48,67</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">Pix</span>
                <span className="rounded-full bg-secondary-foreground/10 px-3 py-1.5">Apple Pay</span>
                <span className="rounded-full bg-secondary-foreground/10 px-3 py-1.5">Google Pay</span>
              </div>
              <div className="mt-4 flex h-8 items-center gap-[3px]">
                {Array.from({ length: 48 }, (_, i) => (
                  <span key={i} className="wb w-[3px] flex-1 origin-center rounded-full bg-primary opacity-40" style={{ height: `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%` }} />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="ok flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-5 w-5" /></span>
                <span className="okt text-sm font-semibold text-primary">Pagamento aprovado</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 */}
        <div className={`${split} s5`}>
          <div className="lg:w-[48%]"><Headline lines={[[["O"], ["garçom"]], [["agradece.", true]]]} /></div>
          <div className="tipcard relative w-[270px] rounded-3xl bg-mv-surface p-5 shadow-2xl sm:w-[320px]">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-55">Atendido por</p>
            <p className="font-display text-xl font-bold">Rafael</p>
            <div className="mt-4 flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="st h-7 w-7 fill-primary text-primary" />)}</div>
            <p className="mt-5 text-xs opacity-60">Gorjeta extra (opcional)</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["R$ 5", "R$ 10", "R$ 15"].map((v, i) => (
                <span key={v} className={`tip ${i === 1 ? "tip-on bg-primary text-primary-foreground" : "bg-secondary-foreground/10"} rounded-xl py-2.5 text-center text-sm font-bold`}>{v}</span>
              ))}
            </div>
            {[18, 50, 78].map((l, i) => <Heart key={i} className="heart absolute bottom-16 h-5 w-5 fill-primary text-primary" style={{ left: `${l}%` }} />)}
          </div>
        </div>

        {/* 6 */}
        <div className="layer s6 absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 pb-10 sm:flex-row sm:gap-12">
          <div className="relative flex items-center justify-center">
            {Array.from({ length: 22 }, (_, i) => <span key={i} className="pt absolute h-2.5 w-2.5 rounded-full bg-primary" />)}
            <img src={roundLogo.url} alt="TIPE" className="logo mv-glow h-36 w-36 sm:h-48 sm:w-48 lg:h-56 lg:w-56" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block"><span className="w inline-block">Pague.</span></span>
              <span className="block"><span className="w inline-block">Sem</span></span>
              <span className="block"><span className="w inline-block text-primary">esperar.</span></span>
            </h2>
            <div className="relative mt-6 h-[3px] w-full max-w-[420px] rounded-full bg-secondary-foreground/10">
              <div className="line h-full w-[78%] origin-left rounded-full bg-primary" />
              <span className="dot absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-secondary-foreground" style={{ left: "calc(78% - 5px)" }} />
            </div>
            <div className="cta mt-7 flex flex-wrap justify-center gap-3 sm:justify-start">
              <a href="#lista-de-espera" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-primary-foreground">Entrar na lista de espera <ChevronRight className="h-4 w-4" /></a>
              <Link to="/simulador" className="inline-flex items-center rounded-full border border-secondary-foreground/25 px-6 py-3 font-display font-semibold">Simular</Link>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-6 bottom-5 h-[3px] overflow-hidden rounded-full bg-secondary-foreground/10 lg:inset-x-16">
          <div ref={bar} className="h-full origin-left scale-x-0 bg-primary" />
        </div>
      </div>
    </section>
  );
}
