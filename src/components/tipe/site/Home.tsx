/**
 * Seções da home na ordem da sunday: topo centralizado com a faixa de restaurantes,
 * produtos em carrossel no escuro, as três pessoas da mesa, abas com foto grande,
 * integrações no escuro e planos.
 */
import { CAMINHO_PRODUTO } from "@/components/tipe/site/produtos";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { seloDoProduto, useEstadosLancamento } from "./useLancamento";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Palavras, Reveal, useVelocidadeFaixa } from "@/components/tipe/landing/motion";
import { TRIAL_DAYS } from "@/lib/tipe/plans";
import { AbasDemo, type ItemAba } from "./AbasDemo";
import { Focinho, SetaFios } from "./Bigode";
import { Foto, fotoSrc, type NomeFoto } from "./Foto";
import { CardsPlanos } from "./Planos";
import { TrilhoProdutos } from "./TrilhoProdutos";
import { CartaoInterface } from "./ProdutoPagina";
import { PRODUTOS, produtoPorSlug } from "./produtos";
import { BotaoPrincipal, BotaoSecundario, Secao, Titulo } from "./Site";
import { HubIntegracoes } from "./GradeIntegracoes";

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
      <div className="container-page pb-10 pt-8 text-center sm:pt-20 lg:pb-16">
        <Palavras
          as="p"
          imediato
          className="block font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong"
        >
          Tipe Pay · Pagamento na mesa para restaurantes
        </Palavras>
        <h1 className="mx-auto mt-4 font-display text-[clamp(2.75rem,1rem+7vw,8rem)] font-normal leading-[0.95] tracking-[-0.055em]">
          <Palavras imediato delay={250}>
            Pague.
          </Palavras>{" "}
          <span className="relative inline-block">
            <Palavras imediato delay={390}>
              Sem esperar.
            </Palavras>
            <Focinho className="absolute -right-[0.92em] top-[0.26em] h-[0.36em] w-[0.9em] sm:-right-[1.05em] sm:top-[0.22em] sm:h-[0.44em] sm:w-[1.1em]" />
          </span>
        </h1>
        <p
          className="hero-in mx-auto mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:mt-7 sm:text-xl"
          style={{ "--d": "500ms" } as CSSProperties}
        >
          Seu cliente confere a conta, divide e paga pelo celular. Sua equipe ganha tempo para atender, e você acompanha cada mesa em tempo real.
        </p>
        <div
          className="hero-in mt-9 flex flex-wrap justify-center gap-3"
          style={{ "--d": "650ms" } as CSSProperties}
        >
          <BotaoPrincipal>Solicitar demonstração</BotaoPrincipal>
          <BotaoSecundario href="/simulador">Testar o simulador</BotaoSecundario>
        </div>
        <p
          className="hero-in mt-5 text-sm text-muted-foreground"
          style={{ "--d": "750ms" } as CSSProperties}
        >
          Pré-lançamento: {TRIAL_DAYS} dias grátis para restaurantes · Sem taxa para o cliente
        </p>
      </div>
      <div className="hero-in pb-14 sm:pb-24" style={{ "--d": "800ms" } as CSSProperties}>
        <ul ref={faixa} className="marquee flex w-max gap-4 sm:gap-5" aria-label="Restaurantes">
          {[...RESTAURANTES, ...RESTAURANTES].map((r, i) => (
            <li
              key={i}
              aria-hidden={i >= RESTAURANTES.length || undefined}
              className="relative w-[11.5rem] shrink-0 sm:w-[17rem] lg:w-[20rem]"
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
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[oklch(0.15_0_0)] backdrop-blur sm:left-4 sm:top-4 sm:text-sm">
                {r.tipo}
              </span>
              {r.aviso && (
                <span className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-2xl bg-[oklch(0.13_0_0/0.72)] px-3 py-2 text-[0.78rem] font-medium leading-tight text-white backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:px-3.5 sm:py-2.5 sm:text-sm">
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
  return (
    <Secao tema="escuro" id="produtos">
      <TrilhoProdutos
        titulo={
          <Titulo
            rotulo="Produtos"
            titulo="Feita para o jeito que o seu restaurante já funciona."
          />
        }
        produtos={PRODUTOS}
      />
    </Secao>
  );
}

/* ------------------------------------------------------------- Pessoas */

const AVISO =
  "absolute inset-x-3 bottom-3 rounded-2xl border border-white/50 bg-white/88 p-3.5 text-[oklch(0.15_0_0)] shadow-[0_20px_40px_-20px_rgb(0_0_0/0.5)] backdrop-blur-xl sm:inset-x-4 sm:bottom-4";

const PESSOAS: {
  quem: string;
  foto: NomeFoto;
  posicao: string;
  v: string;
  t: string;
  href: string;
  aviso: ReactNode;
}[] = [
  {
    quem: "Cliente",
    foto: "pix-mao",
    posicao: "50% 50%",
    v: "0",
    t: "aplicativos para baixar. A conta abre na câmera e cada um paga o seu.",
    href: "/pay",
    aviso: (
      <>
        <p className="text-xs text-[oklch(0.45_0_0)]">Mesa 12 · sua parte</p>
        <p className="mt-0.5 flex items-center justify-between font-medium">
          Pix aprovado <span className="money">R$ 73,59</span>
        </p>
      </>
    ),
  },
  {
    quem: "Garçom",
    foto: "gorjeta-mao",
    posicao: "50% 45%",
    v: "70%",
    t: "da gorjeta extra vai para o saldo de quem atendeu a mesa.",
    href: "/equipe",
    aviso: (
      <>
        <p className="text-xs text-[oklch(0.45_0_0)]">Gorjeta extra · Mesa 12</p>
        <p className="mt-0.5 flex items-center justify-between font-medium">
          No seu saldo <span className="money">R$ 7,00</span>
        </p>
      </>
    ),
  },
  {
    quem: "Dono",
    foto: "fechamento",
    posicao: "45% 45%",
    v: "R$ 0",
    t: "de tarifa da Tipe por transação. Você acompanha cada pagamento ao vivo.",
    href: "/gestao",
    aviso: (
      <>
        <p className="text-xs text-[oklch(0.45_0_0)]">Hoje · demonstração</p>
        <p className="mt-0.5 flex items-center justify-between font-medium">
          31 mesas pagas pela Tipe <Check className="h-4 w-4 text-[#03665f]" strokeWidth={3} />
        </p>
      </>
    ),
  },
];

export function PessoasHome() {
  return (
    <Secao tema="escuro" id="para-quem">
      <div className="container-page">
        <Titulo
          rotulo="Para quem é"
          titulo="Uma mesa. Três pessoas."
          texto="Quem paga, quem atende e quem cuida do caixa ganham tempo no mesmo momento."
        />
      </div>
      <ul className="sem-barra mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mt-14 md:container-page md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
        {PESSOAS.map((p, i) => (
          <Reveal
            as="li"
            key={p.quem}
            delay={i * 140}
            className="w-[82vw] max-w-[24rem] shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <a href={p.href} className="group block">
              <div className="relative overflow-hidden rounded-[1.75rem]">
                <Foto
                  nome={p.foto}
                  alt=""
                  posicao={p.posicao}
                  sizes="(min-width: 768px) 32vw, 82vw"
                  className="aspect-[4/4.4]"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-[oklch(0.15_0_0)] sm:left-4 sm:top-4">
                  {p.quem}
                </span>
                <div className={AVISO}>{p.aviso}</div>
              </div>
              <p className="mt-5 font-display text-[clamp(2.4rem,1.8rem+2.4vw,3.6rem)] font-normal leading-none tracking-[-0.05em]">
                {p.v}
              </p>
              <p className="mt-2 max-w-xs text-[1rem] text-muted-foreground">{p.t}</p>
            </a>
          </Reveal>
        ))}
      </ul>
    </Secao>
  );
}

/* --------------------------------------------------------------- Abas */

const ABAS = ["pay", "order", "staff", "kitchen", "restaurant", "ai"] as const;

export function AbasHome() {
  const lancamento = useEstadosLancamento();
  const itens: ItemAba[] = ABAS.map((slug) => {
    const p = produtoPorSlug(slug)!;
    const tela = p.beneficios.find((b) => b.tela)?.tela;
    const selo = seloDoProduto(p, lancamento);
    return {
      id: slug,
      rotulo: p.nome + (selo ? ` · ${selo.toLowerCase()}` : ""),
      titulo: p.titulo,
      texto: p.texto,
      foto: p.foto,
      posicao: p.posicao,
      altFoto: p.altFoto,
      tela,
      altTela: tela ? `Tela real do ${p.nome}` : undefined,
      extra: tela ? undefined : <CartaoInterface cartao={p.cartao} />,
      href: CAMINHO_PRODUTO[p.slug],
      link: `Conhecer o ${p.nome}`,
    };
  });
  return (
    <Secao tema="claro" id="como-funciona-tudo">
      <div className="container-page">
        <Titulo
          rotulo="Tudo numa plataforma"
          titulo="Você cuida do salão. A Tipe cuida do resto."
          className="mb-10 lg:mb-14"
        />
        <AbasDemo itens={itens} />
      </div>
    </Secao>
  );
}

/* --------------------------------------------------------- Integrações */

export function IntegracoesHome() {
  return (
    <Secao tema="escuro" id="integracoes">
      <div className="container-page">
        <Titulo
          centro
          rotulo="Integrações"
          titulo="Integrações, com status honesto."
          texto="Hoje: Lançamento TIPE, API TIPE e pagamento no estabelecimento. Pix e carteiras em piloto. PDVs, delivery, ERP e nota fiscal estão em desenvolvimento ou planejados."
        />
      </div>
      <div className="container-page mt-12 sm:mt-16">
        <HubIntegracoes compacto />
      </div>
      <div className="container-page mt-10 flex flex-col items-center gap-3 text-center">
        <BotaoSecundario href="/integracoes">Ver todas as integrações</BotaoSecundario>
        <p className="text-sm text-muted-foreground">
          Usa outro sistema? Falamos com a sua equipe e ligamos de forma assistida pela API TIPE.
        </p>
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
            titulo="Um plano para cada tamanho de restaurante."
            texto={`A assinatura é pelo número de mesas, sem tarifa da Tipe por transação. Os valores são informados antes da contratação. ${TRIAL_DAYS} dias grátis no pré-lançamento.`}
          />
          <a
            href="/precos"
            className="com-fios inline-flex min-h-12 items-center gap-2 font-medium"
          >
            Comparar os planos <SetaFios />
          </a>
        </div>
        <div className="mt-12">
          <CardsPlanos />
        </div>
      </div>
    </Secao>
  );
}
