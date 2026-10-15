import { useEffect, useRef, useState, type CSSProperties } from "react";
import wordmark from "@/assets/tipe-wordmark-light.png.asset.json";
import roundLogo from "@/assets/tipe-logo-redondo.png.asset.json";
import totemMesa from "@/assets/totem-tipe-mesa12.webp";
import mascotWaiting from "@/assets/mascot-waiting-hd.webp";
import mascotRating from "@/assets/mascot-rating-hd.webp";
import mascotThanks from "@/assets/mascot-thanks-hd.webp";
import {
  Check,
  ChevronRight,
  Star,
  Utensils,
  Wine,
  Coffee,
  Heart,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { trackMesaViva } from "@/lib/tipe/tracking";

type Word = [string, boolean?];

/** Headline with two echo layers that trail behind the reveal, like the reference motion. */
function Headline({ lines, className = "" }: { lines: Word[][]; className?: string }) {
  const body = (echo?: string) =>
    lines.map((line, li) => (
      <span key={li} className="block">
        {line.map(([w, accent], wi) => (
          <span
            key={wi}
            className={`w inline-block will-change-transform ${accent && !echo ? "text-primary" : ""}`}
          >
            {w}
            {wi < line.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </span>
    ));
  return (
    <h2
      className={`relative font-display text-[2.6rem] font-extrabold leading-[1] tracking-normal sm:text-6xl lg:text-[5.2rem] ${className}`}
    >
      <span aria-hidden className="e e2 pointer-events-none absolute inset-0 text-primary/15">
        {body("e")}
      </span>
      <span
        aria-hidden
        className="e e1 pointer-events-none absolute inset-0 text-secondary-foreground/30"
      >
        {body("e")}
      </span>
      <span className="relative">{body()}</span>
    </h2>
  );
}

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`phone relative w-[205px] shrink-0 rounded-[2.2rem] border border-secondary-foreground/10 bg-mv-surface p-3 shadow-2xl sm:w-[240px] lg:w-[270px] ${className}`}
    >
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-secondary-foreground/15" />
      {children}
    </div>
  );
}

const bill = [
  ["Moqueca de peixe", "89,00"],
  ["Caipirinha x2", "38,00"],
  ["Água com gás", "7,90"],
  ["Pudim", "18,00"],
];
const orbit = [
  ["Moqueca", "R$ 89,00", "Ana"],
  ["Caipirinha", "R$ 19,00", "Caio"],
  ["Pudim", "R$ 18,00", "Bia"],
  ["Água com gás", "R$ 7,90", "Leo"],
  ["Casquinha", "R$ 32,00", "Ana"],
  ["Camarão", "R$ 64,00", "Bia"],
];
const group: [string, string][] = [
  ["Ana", "Moqueca ÷ 3"],
  ["Caio", "Moqueca ÷ 3 · Caipirinha"],
  ["Bia", "Moqueca ÷ 3 · Pudim"],
];

/**
 * Mesa Viva: o "vídeo" da landing. As mesmas cenas da versão publicada (logo,
 * QR Code da mesa, consumo ao vivo, divisão, pagamento, gorjeta e assinatura),
 * agora guiadas pela rolagem: a seção fica presa na tela e a linha do tempo
 * avança conforme o visitante rola, com um leve amortecimento para o movimento
 * ficar cinematográfico sem atrasar nem sequestrar o scroll nativo.
 */
export function MesaViva() {
  const wrap = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const passed = useRef(false);
  // Pedaços interativos: dá para marcar quem já pagou e escolher a gorjeta.
  const [pagos, setPagos] = useState<string[]>(["Ana"]);
  const [gorjeta, setGorjeta] = useState(10);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled || !root.current) return;
      const lite = window.matchMedia("(max-width: 767px)").matches;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);
        gsap.set(q(".layer"), { autoAlpha: 0 });
        const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });

        const enter = (s: string, at: number) => {
          tl.set(q(s), { autoAlpha: 1, y: 0, filter: lite ? "none" : "blur(0px)" }, at);
          tl.from(
            q(`${s} > div > h2 > span:last-child .w`),
            {
              yPercent: 120,
              opacity: 0,
              filter: lite ? "none" : "blur(14px)",
              stagger: 0.11,
              duration: 0.8,
            },
            at + 0.05,
          );
          tl.fromTo(
            q(`${s} .e1`),
            { x: -26, opacity: 1 },
            { x: 0, opacity: 0, duration: 1.1, ease: "power3.out" },
            at + 0.15,
          );
          tl.fromTo(
            q(`${s} .e2`),
            { x: -52, opacity: 1 },
            { x: 0, opacity: 0, duration: 1.3, ease: "power3.out" },
            at + 0.2,
          );
          tl.from(q(`${s} .e .w`), { yPercent: 120, stagger: 0.11, duration: 0.8 }, at + 0.15);
        };
        const exit = (s: string, at: number) =>
          tl.to(
            q(s),
            {
              autoAlpha: 0,
              y: -50,
              filter: lite ? "none" : "blur(12px)",
              duration: 0.45,
              ease: "power2.in",
            },
            at,
          );

        // 0 · logo opening
        tl.set(q(".s0"), { autoAlpha: 1 }, 0);
        // Light follows the transparent silhouette, never a rectangular reveal.
        tl.fromTo(
          q(".s0 .wm"),
          {
            opacity: 0.35,
            scale: 0.94,
            filter: "brightness(1.8) drop-shadow(0 0 18px var(--primary))",
          },
          {
            opacity: 1,
            scale: 1,
            filter: "brightness(1.25) drop-shadow(0 0 12px var(--primary))",
            duration: 1.1,
            ease: "sine.out",
          },
          0,
        );
        tl.to(
          q(".s0 .wm"),
          {
            filter: "brightness(1) drop-shadow(0 0 0px var(--primary))",
            duration: 1.1,
            ease: "sine.inOut",
          },
          1.3,
        );
        tl.to(q(".s0 .wm"), { scale: 1.05, duration: 1.4, ease: "sine.inOut" }, 1.6);
        exit(".s0", 3.3);

        // 1 · scan the table
        let t = 3.6;
        enter(".s1", t);
        tl.from(q(".s1 .phone"), { x: 160, rotate: 10, opacity: 0, duration: 1 }, t + 0.2);
        tl.from(
          q(".s1 .qr"),
          { scale: 0.3, opacity: 0, duration: 0.6, ease: "back.out(2)" },
          t + 0.6,
        );
        tl.fromTo(
          q(".s1 .scan"),
          { top: "20%" },
          { top: "63%", duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 3 },
          t + 0.9,
        );
        tl.to(
          q(".s1 .qrbox"),
          { height: 0, opacity: 0, marginBottom: 0, duration: 0.5, ease: "power3.inOut" },
          t + 2.4,
        );
        tl.to(
          q(".s1 .qrfold"),
          { height: 0, opacity: 0, duration: 0.5, ease: "power3.inOut" },
          t + 2.4,
        );
        tl.from(q(".s1 .row"), { x: 40, opacity: 0, stagger: 0.12, duration: 0.5 }, t + 2.6);
        tl.from(
          q(".s1 .masc"),
          { scale: 0, rotate: -18, opacity: 0, y: 30, duration: 0.7, ease: "back.out(2.4)" },
          t + 1.4,
        );
        exit(".s1", t + 4.4);

        // 2 · live bill carousel
        t = 8.3;
        enter(".s2", t);
        tl.from(
          q(".s2 .core"),
          { scale: 0.4, opacity: 0, duration: 0.9, ease: "back.out(1.8)" },
          t + 0.2,
        );
        tl.from(q(".s2 .ring"), { scale: 0.2, opacity: 0, stagger: 0.12, duration: 1.1 }, t + 0.25);
        tl.fromTo(
          q(".s2 .pulse"),
          { scale: 0.6, opacity: 0.7 },
          { scale: 1.9, opacity: 0, duration: 1.6, ease: "power1.out", repeat: 2 },
          t + 0.6,
        );
        tl.fromTo(
          q(".s2 .spin"),
          { rotate: -60 },
          { rotate: 120, duration: 4.4, ease: "power1.inOut" },
          t + 0.1,
        );
        tl.fromTo(
          q(".s2 .ring"),
          { rotate: 0 },
          { rotate: (i: number) => (i % 2 ? -90 : 90), duration: 4.4, ease: "none" },
          t + 0.1,
        );
        tl.fromTo(
          q(".s2 .chip"),
          { rotate: 60 },
          { rotate: -120, duration: 4.4, ease: "power1.inOut" },
          t + 0.1,
        );
        tl.fromTo(
          q(".s2 .core"),
          { scale: 1 },
          { scale: 1.06, duration: 0.6, yoyo: true, repeat: 5, ease: "sine.inOut" },
          t + 1.1,
        );
        tl.from(
          q(".s2 .chipin"),
          { scale: 0, opacity: 0, stagger: 0.12, duration: 0.6, ease: "back.out(2.4)" },
          t + 0.7,
        );
        const money = { v: 0 };
        tl.fromTo(
          money,
          { v: 0 },
          {
            v: 229.9,
            duration: 1.8,
            ease: "power2.out",
            onUpdate: () => {
              const el = q(".s2 .total")[0];
              if (el) el.textContent = money.v.toFixed(2).replace(".", ",");
            },
          },
          t + 0.8,
        );
        exit(".s2", t + 4.3);

        // 3 · split with the table
        t = 12.9;
        enter(".s3", t);
        tl.from(q(".s3 .phone"), { y: 180, opacity: 0, duration: 1 }, t + 0.1);
        tl.from(
          q(".s3 .av"),
          { scale: 0, stagger: 0.1, duration: 0.5, ease: "back.out(2.5)" },
          t + 0.6,
        );
        tl.from(q(".s3 .row"), { x: -30, opacity: 0, stagger: 0.14, duration: 0.5 }, t + 0.9);
        tl.from(
          q(".s3 .side"),
          { scale: 0, opacity: 0, stagger: 0.08, duration: 0.4, ease: "back.out(3)" },
          t + 1.1,
        );
        tl.from(q(".s3 .toast"), { y: 30, opacity: 0, duration: 0.5 }, t + 2.2);
        tl.from(
          q(".s3 .masc"),
          { scale: 0, rotate: -18, opacity: 0, y: 30, duration: 0.7, ease: "back.out(2.4)" },
          t + 1.2,
        );
        exit(".s3", t + 4.4);

        // 4 · pay in seconds
        t = 17.6;
        enter(".s4", t);
        tl.from(q(".s4 .paycard"), { y: 90, opacity: 0, duration: 0.9 }, t + 0.2);
        tl.from(q(".s4 .bub"), { x: 90, opacity: 0, stagger: 0.25, duration: 0.6 }, t + 0.5);
        tl.fromTo(
          q(".s4 .prog"),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.5, ease: "power2.inOut" },
          t + 0.8,
        );
        tl.fromTo(
          q(".s4 .shine"),
          { xPercent: -100 },
          { xPercent: 500, duration: 1.1, ease: "power1.inOut", repeat: 2 },
          t + 0.8,
        );
        tl.from(q(".s4 .seal"), { opacity: 0, y: 8, stagger: 0.15, duration: 0.4 }, t + 2.8);
        tl.from(
          q(".s4 .ok"),
          { scale: 0, rotate: -90, duration: 0.6, ease: "back.out(2.5)" },
          t + 2.4,
        );
        tl.from(q(".s4 .okt"), { opacity: 0, x: -10, duration: 0.4 }, t + 2.7);
        exit(".s4", t + 4.4);

        // 5 · waiter thanks
        t = 22.3;
        enter(".s5", t);
        tl.from(q(".s5 .tipcard"), { x: 140, rotate: 6, opacity: 0, duration: 0.9 }, t + 0.2);
        tl.from(
          q(".s5 .st"),
          { scale: 0, rotate: -120, stagger: 0.1, duration: 0.5, ease: "back.out(3)" },
          t + 0.7,
        );
        tl.from(q(".s5 .tip"), { y: 20, opacity: 0, stagger: 0.1, duration: 0.4 }, t + 1.3);
        tl.fromTo(
          q(".s5 .tip-on"),
          { scale: 1 },
          { scale: 1.12, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" },
          t + 2,
        );
        tl.from(q(".s5 .sent"), { y: 16, opacity: 0, duration: 0.5 }, t + 2.3);
        tl.from(
          q(".s5 .masc"),
          { scale: 0, rotate: -18, opacity: 0, y: 30, duration: 0.7, ease: "back.out(2.4)" },
          t + 1.6,
        );
        exit(".s5", t + 4.2);

        // 6 · elements form the logo + tagline
        t = 26.8;
        tl.set(q(".s6"), { autoAlpha: 1 }, t);
        tl.fromTo(
          q(".s6 .aura"),
          { scale: 0.3, opacity: 0 },
          { scale: 1, opacity: 1, duration: 2.2, ease: "power2.out" },
          t,
        );
        tl.fromTo(
          q(".s6 .burst"),
          { scale: 0.4, opacity: 0.9 },
          { scale: 2.4, opacity: 0, duration: 1.4, stagger: 0.25, ease: "power2.out" },
          t + 0.5,
        );
        tl.fromTo(
          q(".s6 .logo"),
          { scale: 0.55, opacity: 0, rotate: -25, filter: "blur(22px) brightness(2.2)" },
          {
            scale: 1,
            opacity: 1,
            rotate: 0,
            filter: "blur(0px) brightness(1)",
            duration: 1.6,
            ease: "expo.out",
          },
          t + 0.25,
        );
        tl.to(
          q(".s6 .logo"),
          { scale: 1.04, duration: 1.6, yoyo: true, repeat: 2, ease: "sine.inOut" },
          t + 1.9,
        );
        tl.from(
          q(".s6 .w"),
          {
            yPercent: 110,
            opacity: 0,
            filter: lite ? "none" : "blur(10px)",
            stagger: 0.14,
            duration: 1,
          },
          t + 1.1,
        );
        tl.fromTo(
          q(".s6 .beam"),
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 1.4, ease: "power3.inOut" },
          t + 1.8,
        );
        tl.fromTo(
          q(".s6 .shine"),
          { xPercent: -100 },
          { xPercent: 500, duration: 1.3, ease: "power1.inOut", repeat: 2, repeatDelay: 0.2 },
          t + 2.6,
        );
        tl.from(q(".s6 .cta"), { y: 16, opacity: 0, duration: 0.8 }, t + 2.4);
        // Uma pequena pausa no fim para a assinatura respirar antes da próxima seção.
        tl.to({}, { duration: 1.2 }, t + 3.6);

        // Rolagem → progresso. Um único listener passivo; o rAF só roda enquanto há diferença.
        let target = 0;
        let cur = 0;
        let frame = 0;
        const read = () => {
          const r = wrap.current!.getBoundingClientRect();
          const total = r.height - window.innerHeight;
          target = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        };
        const loop = () => {
          frame = 0;
          read();
          cur = reduce ? target : cur + (target - cur) * 0.14;
          if (Math.abs(target - cur) < 0.0004) cur = target;
          tl.progress(cur);
          if (bar.current) bar.current.style.transform = `scaleX(${cur})`;
          if (!passed.current && cur > 0.12) {
            passed.current = true;
            trackMesaViva("passed");
          }
          if (cur !== target) frame = requestAnimationFrame(loop);
        };
        const on = () => {
          if (!frame) frame = requestAnimationFrame(loop);
        };
        loop();
        window.addEventListener("scroll", on, { passive: true });
        window.addEventListener("resize", on);
        stop = () => {
          window.removeEventListener("scroll", on);
          window.removeEventListener("resize", on);
          cancelAnimationFrame(frame);
        };
      }, root);
    })();
    return () => {
      cancelled = true;
      stop?.();
      ctx?.revert();
    };
  }, []);

  const split =
    "layer invisible absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 pb-10 lg:flex-row lg:gap-20 lg:px-16";

  return (
    <section
      ref={wrap}
      id="como-funciona"
      aria-label="Como a TIPE funciona"
      className="relative scroll-mt-16 text-secondary-foreground"
      style={
        {
          height: "620svh",
          background: "#0b1f3a",
          "--mv-stage": "#0b1f3a",
          "--mv-surface": "oklch(0.31 0.06 255)",
        } as CSSProperties
      }
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:26px_26px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary/[0.07] blur-3xl"
        />
        <div ref={root} className="relative mx-auto h-full max-w-7xl">
          {/* 0 */}
          <div className="layer invisible s0 absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <img src={wordmark.url} alt="TIPE" className="wm w-[min(70vw,460px)]" />
            <p className="mt-8 max-w-xl text-sm font-medium leading-6 text-secondary-foreground/80 sm:text-base">
              Pagamento na mesa por QR Code. Sem app, sem fila, sem maquininha rodando.
            </p>
          </div>

          {/* 1 */}
          <div className={`${split} s1`}>
            <div className="lg:w-[48%]">
              <Headline
                lines={[
                  [["Tudo"], ["na"], ["mesa"]],
                  [["em"], ["um", true], ["toque.", true]],
                ]}
              />
            </div>
            <Phone>
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Mesa 12 · Maré Alta
              </p>
              {/* Totem de mesa em acrílico (formato L) */}
              <div className="mx-auto my-3 w-28" style={{ perspective: "520px" }}>
                <div
                  className="qrbox relative overflow-hidden rounded-t-xl rounded-b-sm border border-secondary-foreground/30 bg-secondary-foreground/[0.07] p-1.5 shadow-[0_14px_24px_-12px_rgba(0,0,0,0.7)] backdrop-blur-sm"
                  style={{ transform: "rotateX(12deg)", transformOrigin: "bottom center" }}
                >
                  <span className="pointer-events-none absolute -left-6 top-0 h-full w-8 rotate-12 bg-secondary-foreground/20 blur-md" />
                  <div className="relative">
                    <img
                      src={totemMesa}
                      alt="Totem da Tipe na mesa 12, com o QR Code da conta"
                      width={320}
                      height={480}
                      className="qr block w-full rounded-md"
                    />
                    <span className="scan absolute inset-x-[14%] h-0.5 rounded bg-primary shadow-[0_0_12px_var(--primary)]" />
                  </div>
                </div>
                {/* dobra do L e base apoiada na mesa */}
                <div
                  className="qrfold mx-auto h-5 w-[104%] -translate-x-[2%] rounded-b-md border border-t-0 border-secondary-foreground/30 bg-gradient-to-b from-secondary-foreground/25 to-secondary-foreground/[0.06]"
                  style={{
                    transform: "translateX(-2%) rotateX(68deg)",
                    transformOrigin: "top center",
                  }}
                />
                <div className="mx-auto -mt-2 h-2 w-36 rounded-full bg-mv-stage blur-[3px]" />
              </div>
              <div className="space-y-2">
                {bill.map(([n, v]) => (
                  <div
                    key={n}
                    className="row flex justify-between rounded-xl bg-secondary-foreground/[0.06] px-3 py-2.5 text-xs"
                  >
                    <span>{n}</span>
                    <span className="font-semibold">R$ {v}</span>
                  </div>
                ))}
                <div className="row flex justify-between px-1 pt-1 text-sm font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ 152,90</span>
                </div>
              </div>
            </Phone>
            <img
              src={mascotWaiting}
              alt=""
              aria-hidden
              className="masc pointer-events-none absolute bottom-[12%] right-[6%] hidden h-40 w-auto drop-shadow-2xl lg:block"
            />
          </div>

          {/* 2 */}
          <div className="layer invisible s2 absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pb-10 lg:flex-row lg:gap-16 lg:px-16">
            <div className="lg:w-[44%]">
              <Headline
                lines={[
                  [["Consumo"]],
                  [
                    ["ao", true],
                    ["vivo.", true],
                  ],
                ]}
              />
            </div>
            <div className="relative h-[300px] w-[300px] shrink-0 sm:h-[400px] sm:w-[400px] lg:h-[460px] lg:w-[460px]">
              {[100, 74, 48].map((size) => (
                <span
                  key={size}
                  className="ring absolute rounded-full border border-primary/25"
                  style={{ inset: `${(100 - size) / 2}%` }}
                />
              ))}
              <span className="pulse absolute inset-[34%] rounded-full border-2 border-primary/50" />
              <div className="core absolute inset-[34%] flex flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_var(--primary)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-75">
                  Mesa 12
                </span>
                <span className="whitespace-nowrap font-display text-base font-extrabold sm:text-xl lg:text-2xl">
                  R$ <span className="total">229,90</span>
                </span>
              </div>
              <div className="spin absolute inset-0">
                {orbit.map(([n, p, who], i) => {
                  const ang = (i / orbit.length) * Math.PI * 2 - Math.PI / 2;
                  const rad = i % 2 ? 37 : 50;
                  return (
                    <div
                      key={n}
                      className="absolute"
                      style={{
                        left: `${50 + Math.cos(ang) * rad}%`,
                        top: `${50 + Math.sin(ang) * rad}%`,
                      }}
                    >
                      <div className="chip -translate-x-1/2 -translate-y-1/2">
                        <div className="chipin whitespace-nowrap rounded-2xl border border-secondary-foreground/10 bg-mv-surface px-3 py-2 shadow-xl">
                          <p className="text-[11px] font-semibold sm:text-xs">{n}</p>
                          <p className="text-[10px] opacity-60">
                            <span className="text-primary">{p}</span> · {who}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3 */}
          <div className={`${split} s3 lg:flex-row-reverse`}>
            <div className="lg:w-[46%]">
              <Headline lines={[[["Divisão"]], [["sem"], ["calculadora.", true]]]} />
            </div>
            <div className="flex items-center gap-4">
              <Phone>
                <p className="font-display text-base font-bold">Mesa 12</p>
                <p className="text-[10px] opacity-50">3 pessoas pagando juntas</p>
                <div className="mt-3 flex -space-x-2">
                  {group.map(([n]) => (
                    <span
                      key={n}
                      className="av flex h-8 items-center justify-center rounded-full bg-primary/25 px-3 text-[11px] font-bold text-primary ring-2 ring-mv-surface"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {group.map(([n, d]) => {
                    const pago = pagos.includes(n);
                    return (
                      <button
                        type="button"
                        key={n}
                        aria-pressed={pago}
                        onClick={() =>
                          setPagos((v) => (v.includes(n) ? v.filter((x) => x !== n) : [...v, n]))
                        }
                        className="row flex w-full items-center gap-3 rounded-xl bg-secondary-foreground/[0.06] p-2.5 text-left transition-colors hover:bg-secondary-foreground/[0.12]"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors ${pago ? "bg-primary text-primary-foreground" : "border border-secondary-foreground/30"}`}
                        >
                          {pago && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold">{n}</span>
                          <span className="block truncate text-[10px] opacity-55">{d}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-primary">
                          {pago ? "pagou" : "pagar"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-[10px] font-semibold text-primary">
                  {pagos.length === group.length
                    ? "Mesa fechada. Bom resto de noite!"
                    : `Faltam ${group.length - pagos.length} de ${group.length} · toque para pagar`}
                </p>
                <div className="toast mt-3 rounded-xl bg-secondary-foreground/[0.08] px-3 py-2 text-[11px]">
                  Leo entrou na mesa
                </div>
                <div className="mt-3 rounded-full bg-primary py-2.5 text-center text-xs font-bold text-primary-foreground">
                  + Escolher meus itens
                </div>
              </Phone>
              <img
                src={mascotRating}
                alt=""
                aria-hidden
                className="masc pointer-events-none absolute bottom-[10%] left-[8%] hidden h-40 w-auto drop-shadow-2xl lg:block"
              />
              <div className="hidden flex-col gap-3 sm:flex">
                {[Utensils, Wine, Star, Coffee, Heart].map((I, i) => (
                  <span
                    key={i}
                    className="side flex h-10 w-10 items-center justify-center rounded-full bg-mv-surface text-primary"
                  >
                    <I className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4 */}
          <div className="layer invisible s4 absolute inset-0 flex flex-col justify-center gap-8 px-6 pb-10 lg:px-16">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <Headline lines={[[["Pague"], ["em"]], [["segundos.", true]]]} />
              <div className="hidden w-[340px] flex-col gap-3 sm:flex">
                <div className="bub ml-auto flex w-[300px] items-center gap-3 rounded-2xl bg-mv-surface p-3 text-sm">
                  <span className="rounded-full bg-primary/25 px-2.5 py-1 text-xs font-bold text-primary">
                    Ana
                  </span>
                  <span>Paguei minha parte!</span>
                </div>
                <div className="bub ml-auto flex w-[280px] items-center gap-3 rounded-2xl bg-mv-surface p-3 text-sm">
                  <span className="rounded-full bg-primary/25 px-2.5 py-1 text-xs font-bold text-primary">
                    Caio
                  </span>
                  <span>Já foi também, fácil demais.</span>
                </div>
              </div>
            </div>
            <div className="paycard flex flex-col gap-5 rounded-3xl bg-mv-surface p-5 sm:flex-row sm:items-center">
              <div
                className="flex h-28 w-full shrink-0 flex-col justify-end rounded-2xl p-4 sm:h-36 sm:w-44"
                style={{
                  background: "radial-gradient(circle at 25% 20%, var(--primary), transparent 80%)",
                }}
              >
                <p className="font-display text-lg font-extrabold leading-tight">MESA 12</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] opacity-55">Sua parte · Moqueca ÷ 3 + Caipirinha</p>
                <p className="font-display text-2xl font-bold">R$ 48,67</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
                    Pix
                  </span>
                  <span className="rounded-full bg-secondary-foreground/10 px-3 py-1.5">
                    Apple Pay
                  </span>
                  <span className="rounded-full bg-secondary-foreground/10 px-3 py-1.5">
                    Google Pay
                  </span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary-foreground/10">
                  <div className="prog relative h-full origin-left overflow-hidden rounded-full bg-primary shadow-[0_0_14px_var(--primary)]">
                    <span className="shine absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-transparent via-primary-foreground/80 to-transparent" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="ok flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-5 w-5" />
                  </span>
                  <span className="okt text-sm font-semibold text-primary">Pagamento aprovado</span>
                  <span className="seal ml-auto hidden items-center gap-1 text-[11px] opacity-70 sm:flex">
                    <Landmark className="h-3.5 w-3.5 text-primary" />
                    aprovado pelo banco
                  </span>
                  <span className="seal hidden items-center gap-1 text-[11px] opacity-70 sm:flex">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    seguro
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 */}
          <div className={`${split} s5`}>
            <div className="lg:w-[48%]">
              <Headline lines={[[["O"], ["garçom"]], [["agradece.", true]]]} />
            </div>
            <div className="tipcard relative w-[270px] rounded-3xl bg-mv-surface p-5 shadow-2xl sm:w-[320px]">
              <p className="text-[11px] uppercase tracking-[0.2em] opacity-55">Atendido por</p>
              <p className="font-display text-xl font-bold">Rafael</p>
              <div className="mt-4 flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="st h-7 w-7 fill-primary text-primary" />
                ))}
              </div>
              <p className="mt-5 text-xs opacity-60">Gorjeta extra (opcional)</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[5, 10, 15].map((v, i) => (
                  <button
                    type="button"
                    key={v}
                    aria-pressed={gorjeta === v}
                    onClick={() => setGorjeta(v)}
                    className={`tip ${i === 1 ? "tip-on" : ""} ${gorjeta === v ? "bg-primary text-primary-foreground" : "bg-secondary-foreground/10 hover:bg-secondary-foreground/20"} rounded-xl py-2.5 text-center text-sm font-bold transition-colors`}
                  >
                    R$ {v}
                  </button>
                ))}
              </div>
              <div className="sent mt-4 flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-xs font-semibold text-primary">
                <Heart className="h-4 w-4 fill-primary" />
                R$ {gorjeta} para o Rafael · R$ {(gorjeta * 0.7).toFixed(2).replace(".", ",")} vão
                para o saldo dele
              </div>
              <img
                src={mascotThanks}
                alt=""
                aria-hidden
                className="masc pointer-events-none absolute -right-10 -top-24 h-28 w-auto drop-shadow-2xl sm:-right-16 sm:-top-28 sm:h-36"
              />
            </div>
          </div>

          {/* 6 */}
          <div className="layer invisible s6 absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 pb-10 sm:flex-row sm:gap-12">
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden
                className="aura absolute h-[150%] w-[150%] rounded-full bg-primary/20 blur-3xl"
              />
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden
                  className="burst absolute inset-0 rounded-full border-2 border-primary/60"
                />
              ))}
              <div className="logo relative h-36 w-36 overflow-hidden rounded-full shadow-[0_0_50px_color-mix(in_oklab,var(--primary)_45%,transparent)] [clip-path:circle(50%)] sm:h-48 sm:w-48 lg:h-56 lg:w-56">
                <img
                  src={roundLogo.url}
                  alt="TIPE"
                  className="h-full w-full scale-[1.03] rounded-full object-cover"
                />
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                <span className="block">
                  <span className="w inline-block">Pague.</span>
                </span>
                <span className="block">
                  <span className="w inline-block">Sem</span>
                </span>
                <span className="block">
                  <span className="w inline-block text-primary">esperar.</span>
                </span>
              </h2>
              <div className="beam relative mx-auto mt-6 h-[2px] w-full max-w-[420px] origin-left overflow-hidden rounded-full bg-gradient-to-r from-primary/70 via-primary/40 to-transparent sm:mx-0">
                <span className="shine absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_var(--primary)]" />
              </div>
              <div className="cta mt-7 flex flex-wrap justify-center gap-3 sm:justify-start">
                <a
                  href="#demonstracao"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-display font-medium text-black"
                >
                  Quero a Tipe no meu restaurante <ChevronRight className="h-4 w-4" />
                </a>
                <a
                  href="/simulador"
                  className="inline-flex items-center rounded-full border border-secondary-foreground/25 px-6 py-3 font-display font-medium"
                >
                  Testar o simulador
                </a>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-6 bottom-9 flex items-center justify-between pr-14 text-xs text-secondary-foreground/65 lg:inset-x-16 lg:pr-0">
            <span>Role para ver a mesa acontecer</span>
            <a
              href="#para-clientes"
              onClick={() => trackMesaViva("skip")}
              className="font-semibold text-primary hover:underline"
            >
              Pular
            </a>
          </div>
          <div className="absolute inset-x-6 bottom-5 h-[3px] overflow-hidden rounded-full bg-secondary-foreground/10 lg:inset-x-16">
            <div ref={bar} className="h-full origin-left scale-x-0 bg-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
