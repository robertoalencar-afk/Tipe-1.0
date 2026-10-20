/**
 * Seções da home na ordem da sunday: topo centralizado com a faixa de restaurantes,
 * produtos em carrossel no escuro, as três pessoas da mesa, abas com foto grande,
 * integrações no escuro e planos.
 */
import { useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Bigodes } from "@/components/tipe/landing/Marcas";
import { Palavras, Reveal, useVelocidadeFaixa } from "@/components/tipe/landing/motion";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { cn } from "@/lib/utils";
import { Foto, fotoSrc, type NomeFoto } from "./Foto";
import { GradeIntegracoes } from "./GradeIntegracoes";
import { CardsPlanos } from "./Planos";
import { CardProduto, CartaoInterface } from "./ProdutoPagina";
import { PRODUTOS, produtoPorSlug } from "./produtos";
import { BotaoPrincipal, BotaoSecundario, Secao, Titulo } from "./Site";

/* ---------------------------------------------------------------- Topo */

const RESTAURANTES: { foto: NomeFoto; tipo: string; aviso?: string }[] = [
  { foto: "boteco", tipo: "Boteco", aviso: "Mesa 4 · Pix aprovado" },
  { foto: "pizzaria", tipo: "Pizzaria" },
  { foto: "bistro", tipo: "Bistrô", aviso: "Gorjeta extra · R$ 10,00" },
  { foto: "cafe", tipo: "Cafeteria" },
  { foto: "japones", tipo: "Japonês", aviso: "Mesa 2 · conta dividida em 3" },
  { foto: "hamburgueria", tipo: "Hamburgueria" },
];

export function TopoHome() {
  const faixa = useVelocidadeFaixa<HTMLUListElement>(90);
  return (
    <section data-tema="claro" className="relative -mt-16 overflow-hidden pt-16">
      <div className="container-page pb-12 pt-12 text-center sm:pt-20 lg:pb-16">
        <Palavras
          as="p"
          imediato
          className="block font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong"
        >
          Pagamento na mesa por QR Code
        </Palavras>
        <h1 className="mx-auto mt-5 font-display text-[clamp(3.4rem,1.2rem+7vw,8rem)] font-normal leading-[0.92] tracking-[-0.055em]">
          <Palavras imediato delay={250}>
            Pague.
          </Palavras>{" "}
          <span className="relative inline-block">
            <Palavras imediato delay={390}>
              Sem esperar.
            </Palavras>
            <Bigodes className="absolute -right-[0.9em] top-[0.3em] h-[0.36em] w-[0.95em]" />
          </span>
        </h1>
        <p
          className="hero-in mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl"
          style={{ "--d": "500ms" } as CSSProperties}
        >
          O cliente aponta a câmera, divide a conta e paga com Pix, Apple Pay ou Google Pay. O
          garçom recebe a gorjeta, a cozinha vê o pedido e você acompanha tudo ao vivo.
        </p>
        <div
          className="hero-in mt-9 flex flex-wrap justify-center gap-3"
          style={{ "--d": "650ms" } as CSSProperties}
        >
          <BotaoPrincipal>Começar o teste grátis</BotaoPrincipal>
          <BotaoSecundario href="/simulador">Testar o simulador</BotaoSecundario>
        </div>
        <p
          className="hero-in mt-5 text-sm text-muted-foreground"
          style={{ "--d": "750ms" } as CSSProperties}
        >
          {TRIAL_DAYS} dias grátis · Sem taxa para o cliente · Sem aplicativo
        </p>
      </div>
      <div className="hero-in pb-20 sm:pb-28" style={{ "--d": "800ms" } as CSSProperties}>
        <ul ref={faixa} className="marquee flex w-max gap-4 sm:gap-5" aria-label="Restaurantes">
          {[...RESTAURANTES, ...RESTAURANTES].map((r, i) => (
            <li
              key={i}
              aria-hidden={i >= RESTAURANTES.length || undefined}
              className="relative w-[15rem] shrink-0 sm:w-[19rem] lg:w-[21rem]"
            >
              <div className="overflow-hidden rounded-[1.75rem]">
                <img
                  src={fotoSrc(r.foto).src}
                  srcSet={fotoSrc(r.foto).srcSet}
                  sizes="(min-width: 1024px) 21rem, 15rem"
                  alt={i < RESTAURANTES.length ? `${r.tipo} usando a Tipe` : ""}
                  loading={i < 4 ? "eager" : "lazy"}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105"
                />
              </div>
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-[oklch(0.15_0_0)] backdrop-blur">
                {r.tipo}
              </span>
              {r.aviso && (
                <span className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-2xl bg-[oklch(0.13_0_0/0.72)] px-3.5 py-2.5 text-sm font-medium text-white backdrop-blur-md">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {r.aviso}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Produtos */

export function ProdutosHome() {
  const trilho = useRef<HTMLDivElement>(null);
  const andar = (dir: number) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 720), behavior: "smooth" });
  };
  return (
    <Secao tema="escuro" id="produtos">
      <div className="container-page flex flex-wrap items-end justify-between gap-6">
        <Titulo
          rotulo="Produtos"
          titulo="Feita para o jeito que o seu restaurante já funciona."
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => andar(-1)}
            aria-label="Produtos anteriores"
            className="grid h-12 w-12 place-items-center rounded-full border border-border"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => andar(1)}
            aria-label="Próximos produtos"
            className="grid h-12 w-12 place-items-center rounded-full border border-border"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={trilho}
        className="sem-barra mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]"
      >
        {PRODUTOS.map((p, i) => (
          <Reveal key={p.slug} delay={Math.min(i, 3) * 110} className="w-[78vw] max-w-[22rem] shrink-0 snap-start">
            <CardProduto p={p} />
          </Reveal>
        ))}
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------- Pessoas */

const PESSOAS = [
  {
    quem: "Cliente",
    foto: "pay" as NomeFoto,
    v: "0",
    t: "aplicativos para baixar. A conta abre na câmera.",
    href: "/produtos/pay",
  },
  {
    quem: "Garçom",
    foto: "staff" as NomeFoto,
    v: "70%",
    t: "da gorjeta extra vai para quem atendeu a mesa.",
    href: "/produtos/staff",
  },
  {
    quem: "Dono",
    foto: "restaurant" as NomeFoto,
    v: "R$ 0",
    t: "de tarifa da Tipe por transação nas contas.",
    href: "/produtos/restaurant",
  },
];

export function PessoasHome() {
  return (
    <Secao tema="escuro" id="para-quem">
      <div className="container-page">
        <Titulo
          centro
          rotulo="Para quem é"
          titulo="Uma mesa. Três pessoas."
          texto="Quem paga, quem atende e quem cuida do caixa ganham tempo no mesmo momento."
        />
        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {PESSOAS.map((p, i) => (
            <Reveal as="li" key={p.quem} delay={i * 140}>
              <a href={p.href} className="group block">
                <div className="relative">
                  <Foto
                    nome={p.foto}
                    alt=""
                    sizes="(min-width: 768px) 32vw, 92vw"
                    className="aspect-[4/5] rounded-[1.75rem]"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-[oklch(0.15_0_0)]">
                    {p.quem}
                  </span>
                </div>
                <p className="mt-6 font-display text-[clamp(2.6rem,1.8rem+2.4vw,3.8rem)] font-normal leading-none tracking-[-0.05em]">
                  {p.v}
                </p>
                <p className="mt-3 max-w-xs text-[1.02rem] text-muted-foreground">{p.t}</p>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </Secao>
  );
}

/* --------------------------------------------------------------- Abas */

const ABAS = ["pay", "order", "staff", "kitchen", "restaurant", "ai"] as const;

export function AbasHome() {
  const [ativa, setAtiva] = useState(0);
  const p = produtoPorSlug(ABAS[ativa]!)!;
  return (
    <Secao tema="claro" id="como-funciona-tudo">
      <div className="container-page">
        <Titulo
          rotulo="Tudo numa plataforma"
          titulo="Você cuida do salão. A Tipe cuida do resto."
        />
        <div
          role="tablist"
          aria-label="Produtos da Tipe"
          className="sem-barra -mx-4 mt-10 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {ABAS.map((slug, i) => {
            const pr = produtoPorSlug(slug)!;
            return (
              <button
                key={slug}
                type="button"
                role="tab"
                aria-selected={ativa === i}
                onClick={() => setAtiva(i)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-[0.95rem] font-medium",
                  ativa === i
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <pr.icone className="h-4 w-4" />
                {pr.nome.replace("Tipe ", "")}
              </button>
            );
          })}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-stretch">
          <div key={p.slug} className="troca-in relative overflow-hidden rounded-[2rem]">
            <Foto
              nome={p.foto}
              alt={p.altFoto}
              posicao={p.posicao}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="aspect-[4/5] sm:aspect-[16/11] lg:h-full lg:min-h-[34rem] lg:aspect-auto"
            />
            <CartaoInterface
              cartao={p.cartao}
              className="absolute bottom-5 right-5 w-[min(80%,19rem)] sm:bottom-8 sm:right-8"
            />
          </div>
          <div key={`t-${p.slug}`} className="troca-in flex flex-col justify-between rounded-[2rem] bg-background-muted p-7 sm:p-9">
            <div>
              <p className="flex items-center gap-2 text-brand-strong">
                <p.icone className="h-5 w-5" /> {p.nome}
                {p.status === "em-breve" && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    Em breve
                  </span>
                )}
              </p>
              <p className="mt-4 font-display text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] leading-[1.02] tracking-[-0.04em]">
                {p.titulo}
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">{p.texto}</p>
              <ul className="mt-6 space-y-2.5">
                {p.beneficios.slice(0, 3).map((b) => (
                  <li key={b.t} className="flex gap-2.5 text-[0.95rem]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" strokeWidth={2.5} />
                    <span>
                      <span className="font-medium">{b.t}.</span>{" "}
                      <span className="text-muted-foreground">{b.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <a
              href={`/produtos/${p.slug}`}
              className="mt-8 inline-flex items-center gap-2 font-medium"
            >
              Conhecer o {p.nome} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </Secao>
  );
}

/* --------------------------------------------------------- Integrações */

export function IntegracoesHome() {
  return (
    <Secao tema="escuro" id="integracoes">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
        <div>
          <Titulo
            rotulo="Integrações"
            titulo="Tudo conversa, do pedido ao Pix."
            texto="Use a Tipe completa ou só o fechamento da conta junto do PDV que você já tem. O que ainda está a caminho aparece assim."
          />
          <a
            href="/integracoes"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full border border-foreground/25 px-7 font-medium"
          >
            Ver integrações <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <GradeIntegracoes compacta />
      </div>
    </Secao>
  );
}

/* --------------------------------------------------------------- Planos */

export function PlanosHome() {
  return (
    <Secao tema="claro" id="precos">
      <span id="planos" className="block -translate-y-16" aria-hidden />
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Titulo
            rotulo="Planos"
            titulo="Preço simples. Sem surpresa."
            texto={`Você paga pelo número de mesas, não por transação. ${TRIAL_DAYS} dias grátis, sem cartão de crédito.`}
          />
          <a href="/precos" className="inline-flex items-center gap-2 font-medium">
            Comparar os planos <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-12">
          <CardsPlanos />
        </div>
      </div>
    </Secao>
  );
}
