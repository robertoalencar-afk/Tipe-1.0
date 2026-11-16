/**
 * Solicitar demonstração (antes /solicitar-demonstracao, que redireciona): formulário no topo, faixa
 * rolando, cinco cards animados do que muda na mesa, os benefícios por público em
 * carrosséis que andam sozinhos e um fecho que volta ao formulário.
 * 04/11: cada foto aparece uma vez só na página (cenas do casting).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { WaitlistForm } from "@/components/tipe/WaitlistForm";
import { LandingFooter, LandingHeader } from "@/components/tipe/landing/LandingChrome";
import { Foto, type NomeFoto } from "@/components/tipe/site/Foto";
import { ResultadosMesa } from "@/components/tipe/site/ResultadosMesa";
import { SimboloTipe } from "@/components/tipe/landing/Marcas";
import { useVelocidadeFaixa } from "@/components/tipe/landing/motion";
import { useMovimentoReduzido, useVisivel } from "@/components/tipe/site/produto/useVisivel";
import { LebreConversa } from "@/components/tipe/site/LebreConversa";
import { cn } from "@/lib/utils";

const TITLE = "Solicitar demonstração | TIPE";
const DESC =
  "Solicite uma demonstração do Tipe Pay: conta e divisão pelo QR Code, painel do salão e implantação acompanhada. Pagamentos digitais sujeitos à validação por restaurante.";

export const Route = createFileRoute("/solicitar-demonstracao")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#021E34" },
      { property: "og:url", content: "https://tipe.digital/solicitar-demonstracao" },
      { property: "og:image", content: "https://tipe.digital/marca/tipe-logo-redondo.png" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/solicitar-demonstracao" }],
  }),
  component: TesteGratis,
});

function TesteGratis() {
  return (
    <div id="top" className="sunday min-h-screen bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo">
        <Topo />
        <Faixa />
        <ResultadosMesa />
        <Categorias />
        <p className="container-page pb-8 text-sm text-muted-foreground">
          Telas, valores e notificações desta página são exemplos demonstrativos, sem cobranças ou
          resultados reais de restaurantes.
        </p>
        <Fecho />
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
          Solicite uma demonstração
        </p>
        <h1 className="mt-4 font-display text-[clamp(3rem,1.4rem+4.6vw,5.6rem)] font-medium leading-[0.96]">
          Vamos colocar a Tipe nas suas mesas.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Preencha o formulário e a equipe Tipe fala com você para uma demonstração e apresenta as
          condições de contratação.
        </p>
        <ul className="mt-8 space-y-3 text-[1.05rem]">
          {[
            "Demonstração gratuita com a equipe",
            "A equipe instala os totens, liga o caixa e treina o salão",
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
        <LebreConversa className="mt-10 hidden max-w-md lg:flex" />
      </div>
      <div
        id="formulario"
        className="relative z-10 scroll-mt-24 self-start rounded-[2rem] border border-border bg-surface p-5 shadow-[0_40px_80px_-40px_oklch(0.2_0.04_250/0.35)] sm:p-8"
      >
        <h2 className="font-display text-2xl leading-tight">Solicite sua demonstração</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Conheça o Pay e os módulos Order, Cozinha, Equipe, Gestão e Lebre. A equipe confirma
          plano, integração e condições antes da contratação.
        </p>
        <WaitlistForm />
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Hoje você pode pagar em dinheiro ou na maquininha do local. Pix, Apple Pay e Google Pay
          dependem de habilitação e validação por restaurante. Reserva V2: em breve.
        </p>
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
  const faixa = useVelocidadeFaixa<HTMLUListElement>(50);
  return (
    <section aria-label="Para quem é a Tipe" className="border-y border-border py-8">
      <p className="container-page mb-5 text-center text-sm text-muted-foreground">
        Feita para quem serve mesa no Brasil
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <ul ref={faixa} className="faixa flex w-max items-center">
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

/* -------------------------------- Benefícios por público, em carrosséis */

type Slide = {
  eyebrow: string;
  titulo: string;
  texto: string;
  scene: NomeFoto;
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
        texto:
          "QR Code na mesa, conta ao vivo e nenhum aplicativo para baixar. Dinheiro e maquininha no local disponíveis; Pix e carteiras digitais sujeitos à validação por restaurante.",
        scene: "cena-casal",
        alt: "Casal à mesa pagando pelo celular, com o totem da Tipe entre os pratos",
        selo: ["Pix aprovado", "Sua parte: R$ 51,97"],
        link: ["/pay", "Como o cliente paga"],
      },
      {
        eyebrow: "Para o cliente",
        titulo: "Cada um paga o que consumiu.",
        texto:
          "Por item ou dividindo um prato. Quem sai primeiro não deixa a conta para os outros.",
        scene: "cena-praia",
        alt: "Amigos na barraca de praia pagando cada um a sua parte",
        selo: ["Mesa 12 fechada", "3 pessoas pagaram"],
        link: ["/simulador", "Testar o simulador"],
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
        titulo: "A gorjeta extra tem destino claro.",
        texto:
          "70% da gorjeta extra vai para quem atendeu e 30% para a Tipe. Saques seguem ciclos quinzenais e confirmação do Pix.",
        scene: "cena-garcom",
        alt: "Garçom sorrindo no salão, ao lado do totem da Tipe na mesa",
        selo: ["Gorjeta extra da Mesa 12", "R$ 7,00 no seu saldo"],
        link: ["/equipe", "Área do garçom"],
      },
      {
        eyebrow: "Para a equipe",
        titulo: "Menos corrida com maquininha.",
        texto: "O garçom atende mais mesas e só leva a maquininha a quem escolher pagar no local.",
        scene: "cena-bartender",
        alt: "Bartender no balcão com o totem da Tipe ao lado, sem correr com a maquininha",
        selo: ["Mesa 07", "Paga pelo celular"],
        link: ["/equipe", "Como a equipe usa"],
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
          "Dinheiro e maquininha aguardam confirmação do caixa. Nos pagamentos digitais habilitados, só a confirmação do provedor aprova a cobrança.",
        scene: "cena-caixa",
        alt: "Caixa do restaurante com os pagamentos no painel da Tipe",
        selo: ["Mesa 08 · Bruno S.", "Pix aprovado · R$ 150,60"],
        link: ["/gestao", "Ver o painel"],
      },
      {
        eyebrow: "Para o caixa",
        titulo: "Fechamento sem susto.",
        texto: "Histórico de cada mesa, de cada pagamento e de quem atendeu, pronto para conferir.",
        scene: "fechamento",
        alt: "Gerente fechando o dia com o painel da Tipe no tablet",
        selo: ["Recebido hoje", "R$ 2.840,50"],
        link: ["/gestao", "Ver o painel"],
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
        scene: "cena-gerente",
        alt: "Gerente acompanhando as mesas no painel da Tipe, no tablet",
        selo: ["Ao vivo", "5 de 8 mesas abertas"],
        link: ["/gestao", "Conhecer o painel"],
      },
      {
        eyebrow: "Para o dono",
        titulo: "Mais giro, sem taxa para o cliente.",
        texto: "Assinatura mensal por número de mesas. Quem está na mesa não paga nada a mais.",
        scene: "cena-dono",
        alt: "Dono do restaurante acompanhando as vendas no notebook",
        selo: ["Sem taxa para o cliente", "Assinatura por mesas"],
        link: ["/precos", "Ver preços"],
      },
    ],
  },
];

function Categorias() {
  const [ativo, setAtivo] = useState(0);
  const g = GRUPOS[ativo] ?? GRUPOS[0]!;
  return (
    <section aria-labelledby="beneficios" className="pb-24 pt-20 sm:pb-32 sm:pt-28">
      <div className="container-page">
        <p className="font-display text-[clamp(1.2rem,1rem+0.8vw,1.6rem)] text-brand-strong">
          Para cada pessoa do salão
        </p>
        <h2
          id="beneficios"
          className="mt-3 max-w-3xl font-display text-[clamp(2.4rem,1.4rem+3.4vw,4.6rem)] font-medium leading-[1]"
        >
          A Tipe trabalha para todo mundo do salão.
        </h2>
        <div role="tablist" aria-label="Escolha quem você é" className="mt-8 flex flex-wrap gap-2.5">
          {GRUPOS.map((x, n) => (
            <button
              key={x.id}
              id={`aba-${x.id}`}
              type="button"
              role="tab"
              aria-selected={n === ativo}
              aria-controls="painel-beneficios"
              onClick={() => setAtivo(n)}
              className={cn(
                "btn-press inline-flex h-11 items-center gap-2 rounded-full border px-5 font-medium transition-colors",
                n === ativo
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/40",
              )}
            >
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: x.cor }} />
              {x.nome}
            </button>
          ))}
        </div>
      </div>
      <div
        id="painel-beneficios"
        role="tabpanel"
        aria-labelledby={`aba-${g.id}`}
        className="container-page mt-10"
      >
        <Carrossel key={g.id} cor={g.cor} slides={g.slides} />
      </div>
    </section>
  );
}

const PASSO_MS = 6500;

/** Carrossel de tela cheia: a foto aproxima devagar, o texto fica sobre ela e o grupo anda sozinho. */
function Carrossel({ cor, slides }: { cor: string; slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [parado, setParado] = useState(false);
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduzido = useMovimentoReduzido();
  const inicio = useRef<number | null>(null);
  const anda = slides.length > 1 && visivel && !parado && !reduzido;
  const s = slides[i] ?? slides[0]!;
  const ir = (d: number) => setI((v) => (v + d + slides.length) % slides.length);
  useEffect(() => {
    if (!anda) return;
    const t = setTimeout(() => setI((v) => (v + 1) % slides.length), PASSO_MS);
    return () => clearTimeout(t);
  }, [anda, i, slides.length]);
  return (
    <div
      ref={ref}
      onPointerEnter={(e) => e.pointerType === "mouse" && setParado(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setParado(false)}
      onFocus={() => setParado(true)}
      onBlur={() => setParado(false)}
      onTouchStart={(e) => {
        inicio.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const x0 = inicio.current;
        const x1 = e.changedTouches[0]?.clientX;
        inicio.current = null;
        if (x0 == null || x1 == null || Math.abs(x1 - x0) < 48) return;
        ir(x1 < x0 ? 1 : -1);
      }}
      className="relative isolate min-h-[34rem] overflow-hidden rounded-[2.5rem] bg-ink text-white sm:min-h-[38rem]"
    >
      {slides.map((x, n) => (
        <div
          key={x.titulo}
          aria-hidden={n !== i}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none",
            n === i ? "opacity-100" : "opacity-0",
          )}
        >
          <div key={n === i ? `on${i}` : "off"} className={cn("h-full w-full", n === i && "zoom-lento")}>
            <Foto
              nome={x.scene}
              alt={x.alt}
              sizes="(min-width: 1024px) 1200px, 100vw"
              className="h-full w-full"
            />
          </div>
        </div>
      ))}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(0deg,oklch(0.2_0.04_250/0.92)_0%,oklch(0.2_0.04_250/0.55)_45%,oklch(0.2_0.04_250/0.05)_80%)] lg:bg-[linear-gradient(90deg,oklch(0.2_0.04_250/0.9)_0%,oklch(0.2_0.04_250/0.6)_38%,transparent_68%)]"
      />
      <div
        key={`selo${i}`}
        className="pop-in absolute right-5 top-5 max-w-[15rem] rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-xl sm:right-8 sm:top-8"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-ink">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          {s.selo[0]}
        </p>
        <p className="mt-1 pl-8 text-sm text-white/75">{s.selo[1]}</p>
      </div>
      <div className="relative flex min-h-[34rem] flex-col justify-end p-6 sm:min-h-[38rem] sm:p-10 lg:max-w-[40rem] lg:p-14">
        <div key={i} className="hero-in">
          <p className="font-display text-[clamp(1.2rem,1rem+0.8vw,1.6rem)]" style={{ color: cor }}>
            <span className="rounded-full bg-white/90 px-3 py-1 text-ink">{s.eyebrow}</span>
          </p>
          <h3 className="mt-5 font-display text-[clamp(2.1rem,1.3rem+2.6vw,3.6rem)] font-medium leading-[1.02]">
            {s.titulo}
          </h3>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-white/80">{s.texto}</p>
          <a
            href={s.link[0]}
            className="btn-press mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-medium text-ink hover:bg-white/90"
          >
            {s.link[1]} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-8 flex items-center gap-4">
          <div className="flex flex-1 gap-2" role="group" aria-label="Escolher slide">
            {slides.map((x, n) => (
              <button
                key={x.titulo}
                type="button"
                aria-label={`Mostrar: ${x.titulo}`}
                aria-current={n === i}
                onClick={() => setI(n)}
                className="relative h-1.5 max-w-20 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <span
                  key={`${i}-${anda}`}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-white",
                    n === i && "carrossel-progresso",
                  )}
                  style={
                    n < i || (n === i && !anda)
                      ? { width: "100%" }
                      : n === i
                        ? { animationDuration: `${PASSO_MS}ms` }
                        : { width: "0%" }
                  }
                />
              </button>
            ))}
          </div>
          <span aria-hidden className="text-sm tabular-nums text-white/70">
            {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          {slides.length > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => ir(-1)}
                aria-label="Anterior"
                className="btn-press grid h-11 w-11 place-items-center rounded-full border border-white/30 hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => ir(1)}
                aria-label="Próximo"
                className="btn-press grid h-11 w-11 place-items-center rounded-full border border-white/30 hover:bg-white/10"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Fecho */

function Fecho() {
  return (
    <section className="container-page pb-24 sm:pb-32">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#021E34] px-6 py-14 text-white sm:px-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_0%,rgb(15_201_189/0.35),transparent_70%)]"
        />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-display text-[clamp(1.2rem,1rem+0.8vw,1.6rem)] text-[#0FC9BD]">
              Conheça os planos para o seu restaurante
            </p>
            <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2.4rem,1.4rem+3.4vw,4.4rem)] font-medium leading-[1]">
              Peça sua demonstração e comece pela primeira mesa.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#formulario"
              className="btn-press inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#0FC9BD] px-8 font-medium text-[#021E34]"
            >
              Solicitar demonstração <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/simulador"
              className="btn-press inline-flex h-14 items-center justify-center rounded-full border border-white/25 px-8 font-medium hover:border-white/60"
            >
              Testar o simulador
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
