/**
 * Página de teste grátis, no mesmo formato da página de demonstração da sunday
 * (estudada com o REA): formulário no topo, faixa rolando, frases grandes com
 * foto embutida guiadas pela rolagem e, por fim, os benefícios por público,
 * cada um num carrossel com setas.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { WaitlistForm } from "@/components/tipe/WaitlistForm";
import { LandingFooter, LandingHeader } from "@/components/tipe/landing/LandingChrome";
import { EditorialPhoto, type Scene } from "@/components/tipe/landing/EditorialPhoto";
import { SimboloTipe } from "@/components/tipe/landing/Marcas";
import mascotWaiting from "@/assets/mascot-waiting-hd.webp";
import { cn } from "@/lib/utils";

const TITLE = `Teste grátis por ${TRIAL_DAYS} dias | TIPE`;
const DESC =
  "Coloque a Tipe nas mesas do seu restaurante: pagamento por QR Code com Pix, Apple Pay e Google Pay, divisão da conta e gorjeta extra para a equipe.";

export const Route = createFileRoute("/teste-gratis")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
  component: TesteGratis,
});

function TesteGratis() {
  return (
    <div className="sunday min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main id="conteudo">
        <Topo />
        <Faixa />
        <Destaques />
        <Categorias />
      </main>
      <LandingFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- Topo */

function Topo() {
  return (
    <section className="container-page grid gap-12 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1fr_0.95fr] lg:gap-20 lg:pb-24">
      <div className="relative lg:pt-12">
        <p className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] text-brand-strong">
          Teste grátis por {TRIAL_DAYS} dias
        </p>
        <h1 className="mt-4 font-display text-[clamp(3rem,1.4rem+4.6vw,5.6rem)] font-medium leading-[0.96]">
          Vamos colocar a Tipe nas suas mesas.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Preencha o formulário e a equipe Tipe fala com você para uma demonstração. Os primeiros
          restaurantes ganham {TRIAL_DAYS} dias grátis, sem cartão de crédito.
        </p>
        <ul className="mt-8 space-y-3 text-[1.05rem]">
          {[
            "Demonstração gratuita com a equipe",
            "Implantação acompanhada, do totem ao primeiro pagamento",
            "Sem taxa nenhuma para quem está na mesa",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-ink">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          Quer ver antes?{" "}
          <Link
            to="/simulador"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Teste o simulador da Mesa 12
          </Link>
          .
        </p>
        <img
          src={mascotWaiting}
          alt=""
          aria-hidden
          width={1024}
          height={1024}
          className="bob mt-8 hidden w-32 lg:block"
        />
      </div>
      <div className="relative z-10 self-start rounded-[2rem] border border-border bg-surface p-5 shadow-[0_40px_80px_-40px_oklch(0.2_0.04_250/0.35)] sm:p-8">
        <WaitlistForm />
      </div>
    </section>
  );
}

/* --------------------------------------------- Faixa que roda sozinha */

const TIPOS = [
  "Restaurantes",
  "Bares",
  "Cafeterias",
  "Pizzarias",
  "Hamburguerias",
  "Botecos",
  "Barracas de praia",
  "Food halls",
];

function Faixa() {
  const itens = [...TIPOS, ...TIPOS];
  return (
    <section aria-label="Para quem é a Tipe" className="border-y border-border py-8">
      <p className="container-page mb-5 text-center text-sm text-muted-foreground">
        Feita para quem serve mesa no Brasil
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <ul className="faixa flex w-max items-center">
          {itens.map((t, i) => (
            <li
              key={i}
              aria-hidden={i >= TIPOS.length}
              className="flex items-center gap-10 whitespace-nowrap pr-10 font-display text-2xl font-medium text-foreground/70 sm:text-3xl"
            >
              {t}
              <SimboloTipe className="h-6 w-auto" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------- Frases grandes com foto, guiadas pela rolagem */

const FRASES: { antes: string; depois: string; scene: Scene; alt: string }[] = [
  {
    antes: "Mesas",
    depois: "giram mais rápido.",
    scene: "salao",
    alt: "Salão cheio com o totem da Tipe na mesa",
  },
  { antes: "Cada um", depois: "paga o seu.", scene: "amigos", alt: "Amigos dividindo a conta" },
  {
    antes: "A gorjeta",
    depois: "vai direto para a equipe.",
    scene: "garcom",
    alt: "Garçom vendo a gorjeta extra no relógio",
  },
  {
    antes: "A conta",
    depois: "fecha sem maquininha.",
    scene: "mesa",
    alt: "Cliente pagando pelo celular com o totem da Tipe ao lado",
  },
  {
    antes: "O salão inteiro",
    depois: "numa tela só.",
    scene: "gestor",
    alt: "Dona de restaurante acompanhando as mesas no tablet",
  },
];

function Destaques() {
  const box = useRef<HTMLElement>(null);
  const [ativa, setAtiva] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let frame = 0;
    const medir = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(0.999, Math.max(0, -r.top / total)) : 0;
      setAtiva(Math.floor(p * FRASES.length));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={box}
      aria-label="O que muda com a Tipe"
      style={{ height: `${FRASES.length * 60 + 40}svh` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="container-page grid w-full items-center gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
          <ol className="space-y-1 sm:space-y-2">
            {FRASES.map((f, i) => (
              <li
                key={f.antes}
                className={cn(
                  "font-display text-[clamp(1.9rem,1rem+3.4vw,4.6rem)] font-medium leading-[1.06] tracking-[-0.04em] transition-colors duration-500",
                  i === ativa ? "text-foreground" : "text-foreground/15",
                )}
              >
                {f.antes}{" "}
                <span
                  className={cn(
                    "relative mx-1 inline-block h-[0.82em] w-[1.5em] overflow-hidden rounded-full align-[-0.08em] transition-all duration-500",
                    i === ativa ? "opacity-100" : "opacity-30 grayscale",
                  )}
                >
                  <EditorialPhoto
                    scene={f.scene}
                    alt=""
                    aspect="auto"
                    radius="999px"
                    reveal={false}
                    sizes="120px"
                    className="absolute inset-0 !aspect-auto h-full w-full"
                  />
                </span>{" "}
                {f.depois}
              </li>
            ))}
          </ol>
          <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2.25rem] lg:block">
            {FRASES.map((f, i) => (
              <div
                key={f.scene}
                aria-hidden={i !== ativa}
                className={cn(
                  "absolute inset-0 transition-all duration-700 motion-reduce:transition-none",
                  i === ativa ? "scale-100 opacity-100" : "scale-105 opacity-0",
                )}
              >
                <EditorialPhoto
                  scene={f.scene}
                  alt={f.alt}
                  aspect="4/5"
                  radius="0"
                  reveal={false}
                  sizes="32vw"
                  className="!aspect-auto h-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Benefícios por público, em carrosséis */

type Slide = {
  eyebrow: string;
  titulo: string;
  texto: string;
  scene: Scene;
  alt: string;
  selo: [string, string];
  link: [string, string];
};

const GRUPOS: { id: string; nome: string; cor: string; slides: Slide[] }[] = [
  {
    id: "cliente",
    nome: "Para o cliente",
    cor: "oklch(0.55 0.13 180)",
    slides: [
      {
        eyebrow: "Para o cliente",
        titulo: "Pague sem esperar a maquininha.",
        texto: "QR Code na mesa, conta ao vivo e pagamento por Pix, Apple Pay ou Google Pay.",
        scene: "mesa",
        alt: "Cliente pagando pelo celular com o totem da Tipe na mesa",
        selo: ["Pix aprovado", "Sua parte: R$ 51,97"],
        link: ["/#para-clientes", "Como o cliente paga"],
      },
      {
        eyebrow: "Para o cliente",
        titulo: "Cada um paga o que consumiu.",
        texto: "Por item, dividindo um prato, em partes iguais ou a conta inteira.",
        scene: "amigos",
        alt: "Amigos rindo enquanto dividem a conta pelo celular",
        selo: ["Mesa 12 fechada", "3 pessoas pagaram"],
        link: ["/simulador", "Testar o simulador"],
      },
      {
        eyebrow: "Para o cliente",
        titulo: "Sem baixar aplicativo.",
        texto: "A conta abre direto na câmera do celular, em segundos.",
        scene: "casal",
        alt: "Casal sorrindo enquanto paga a conta pelo celular",
        selo: ["Conta aberta", "Mesa 12 · Maré Alta"],
        link: ["/#como-funciona", "Ver a Mesa Viva"],
      },
    ],
  },
  {
    id: "equipe",
    nome: "Para a equipe",
    cor: "oklch(0.6 0.16 50)",
    slides: [
      {
        eyebrow: "Para a equipe",
        titulo: "A gorjeta extra chega na hora.",
        texto:
          "70% da gorjeta extra vai para o saldo de quem atendeu, com saque por Pix a cada quinzena.",
        scene: "garcom",
        alt: "Garçom sorrindo ao ver a gorjeta extra no relógio",
        selo: ["Gorjeta extra da Mesa 12", "R$ 7,00 no seu saldo"],
        link: ["/#para-garcons", "Área do garçom"],
      },
      {
        eyebrow: "Para a equipe",
        titulo: "Menos corrida com maquininha.",
        texto: "O garçom atende mais mesas e só leva a maquininha a quem escolher pagar no local.",
        scene: "salao",
        alt: "Garçom servindo um salão cheio",
        selo: ["Mesa 07", "Paga pelo celular"],
        link: ["/#para-garcons", "Como a equipe usa"],
      },
    ],
  },
  {
    id: "caixa",
    nome: "Para o caixa",
    cor: "oklch(0.5 0.12 255)",
    slides: [
      {
        eyebrow: "Para o caixa",
        titulo: "Cada pagamento já aparece no caixa.",
        texto:
          "O Pix aprovado baixa a conta da mesa sozinho. Dinheiro e maquininha são confirmados com um toque.",
        scene: "gestor",
        alt: "Dona de restaurante acompanhando os pagamentos no tablet",
        selo: ["Mesa 08 · Bruno S.", "Pix aprovado · R$ 150,60"],
        link: ["/#painel", "Ver o painel"],
      },
      {
        eyebrow: "Para o caixa",
        titulo: "Fechamento sem susto.",
        texto: "Histórico de cada mesa, de cada pagamento e de quem atendeu, pronto para conferir.",
        scene: "salao",
        alt: "Salão de restaurante movimentado",
        selo: ["Recebido hoje", "R$ 2.840,50"],
        link: ["/#painel", "Ver o painel"],
      },
    ],
  },
  {
    id: "dono",
    nome: "Para o dono",
    cor: "oklch(0.55 0.15 330)",
    slides: [
      {
        eyebrow: "Para o dono",
        titulo: "Seu salão inteiro numa tela só.",
        texto: "Mesas, pagamentos e equipe em tempo real, no computador, no tablet ou no celular.",
        scene: "gestor",
        alt: "Dona de restaurante sorrindo com o tablet no salão",
        selo: ["Ao vivo", "5 de 8 mesas abertas"],
        link: ["/#painel", "Conhecer o painel"],
      },
      {
        eyebrow: "Para o dono",
        titulo: "Mais giro, sem taxa para o cliente.",
        texto: "Assinatura mensal por número de mesas. Quem está na mesa não paga nada a mais.",
        scene: "amigos",
        alt: "Mesa cheia de amigos felizes",
        selo: ["Sem taxa para o cliente", "Assinatura por mesas"],
        link: ["/#precos", "Ver preços"],
      },
    ],
  },
];

function Categorias() {
  return (
    <section aria-labelledby="beneficios" className="pb-24 pt-20 sm:pb-32 sm:pt-28">
      <div className="container-page">
        <h2
          id="beneficios"
          className="max-w-3xl font-display text-[clamp(2.4rem,1.4rem+3.4vw,4.6rem)] font-medium leading-[1]"
        >
          A Tipe trabalha para todo mundo do salão.
        </h2>
        <ul className="mt-8 flex flex-wrap gap-2.5">
          {GRUPOS.map((g) => (
            <li key={g.id}>
              <a
                href={`#${g.id}`}
                className="inline-flex h-11 items-center rounded-full border border-border px-5 font-medium hover:border-foreground/40"
              >
                {g.nome}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="container-page mt-12 space-y-8 sm:space-y-12">
        {GRUPOS.map((g) => (
          <Carrossel key={g.id} id={g.id} cor={g.cor} slides={g.slides} />
        ))}
      </div>
    </section>
  );
}

function Carrossel({ id, cor, slides }: { id: string; cor: string; slides: Slide[] }) {
  const [i, setI] = useState(0);
  const s = slides[i] ?? slides[0]!;
  const ir = (d: number) => setI((v) => (v + d + slides.length) % slides.length);
  return (
    <div
      id={id}
      className="grid scroll-mt-24 overflow-hidden rounded-[2.5rem] bg-background-muted lg:grid-cols-2"
    >
      <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
        <div key={i} className="hero-in">
          <p className="font-display text-[clamp(1.4rem,1.1rem+1vw,2rem)]" style={{ color: cor }}>
            {s.eyebrow}
          </p>
          <h3 className="mt-6 font-display text-[clamp(2.2rem,1.4rem+2.6vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            {s.titulo}
          </h3>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{s.texto}</p>
          <a
            href={s.link[0]}
            className="btn-press mt-8 inline-flex h-14 items-center gap-2 rounded-full border border-border bg-surface px-7 font-medium hover:border-foreground/40"
          >
            {s.link[1]} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        {slides.length > 1 && (
          <div className="mt-10 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => ir(-1)}
                aria-label="Anterior"
                className="btn-press grid h-14 w-14 place-items-center rounded-full border border-border bg-surface hover:border-foreground/40"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => ir(1)}
                aria-label="Próximo"
                className="btn-press grid h-14 w-14 place-items-center rounded-full border border-border bg-surface hover:border-foreground/40"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2">
              {slides.map((x, n) => (
                <button
                  key={x.titulo}
                  type="button"
                  aria-label={`Mostrar: ${x.titulo}`}
                  aria-current={n === i}
                  onClick={() => setI(n)}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    n === i ? "w-7 bg-foreground" : "w-2.5 bg-foreground/20",
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="relative min-h-[22rem] lg:min-h-[34rem]">
        {slides.map((x, n) => (
          <div
            key={x.titulo}
            aria-hidden={n !== i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none",
              n === i ? "opacity-100" : "opacity-0",
            )}
          >
            <EditorialPhoto
              scene={x.scene}
              alt={x.alt}
              aspect="4/3"
              sizes="(min-width: 1024px) 50vw, 100vw"
              radius="0"
              reveal={false}
              className="!aspect-auto h-full"
            />
          </div>
        ))}
        <div
          key={`selo${i}`}
          className="pop-in absolute bottom-6 right-6 max-w-[16rem] rounded-2xl border border-white/15 bg-[oklch(0.15_0_0/0.6)] p-4 text-white backdrop-blur-xl"
        >
          <p className="flex items-center gap-2 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-ink">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {s.selo[0]}
          </p>
          <p className="mt-1 pl-8 text-sm text-white/70">{s.selo[1]}</p>
        </div>
      </div>
    </div>
  );
}
