/**
 * Página do Tipe Guest (/reserva), Fase 8 do projeto Tipe Guest.
 *
 * Regra da página: separar sempre o que está DISPONÍVEL HOJE na Tipe (avaliação logo depois do
 * pagamento e nome lembrado no mesmo aparelho), o que é PLANEJADO NO GUEST (descoberta, reservas,
 * avaliações públicas, relacionamento) e o que é DEMONSTRAÇÃO (ainda não publicada). Só aparecem
 * telas reais que já existem (src/assets/telas-reais); nenhuma tela do Guest é simulada aqui.
 * Quando a demonstração do Guest existir, o carrossel com as telas dela entra na seção
 * #demonstracao (ver docs/tipe-guest/LANDING.md).
 *
 * Status continua "Em breve": sem links de loja, sem reserva, sem data e sem números.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarCheck,
  Check,
  Clock,
  Compass,
  MonitorPlay,
  Search,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import { Palavras, Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { Foto } from "../Foto";
import { BotaoPrincipal, BotaoSecundario, Secao, Titulo } from "../Site";
import { SequenciaCelular } from "../produto/SequenciaCelular";
import { CelularReal } from "../produto/TelaReal";
import { ListaDuvidas, Relacionados, SeloStatus } from "../ProdutoPagina";
import { FormularioInteresse } from "../FormularioInteresse";
import { duvidasDe, type Produto } from "../produtos";

type Tipo = "hoje" | "planejado" | "demo";

const ROTULO_TIPO: Record<Tipo, string> = {
  hoje: "Disponível hoje",
  planejado: "Planejado no Guest",
  demo: "Demonstração",
};

/** Selo que diz, em todo bloco, se aquilo existe hoje, é plano ou é demonstração. */
export function SeloTipo({ tipo, className }: { tipo: Tipo; className?: string | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.78rem] font-medium",
        tipo === "hoje" && "bg-[#0FC9BD] text-[#021E34]",
        tipo === "planejado" && "bg-[#021E34] text-white",
        tipo === "demo" && "border border-dashed border-current text-current",
        className,
      )}
    >
      {tipo === "hoje" ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      ) : tipo === "planejado" ? (
        <Clock className="h-3.5 w-3.5 text-[#0FC9BD]" aria-hidden />
      ) : (
        <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
      )}
      {ROTULO_TIPO[tipo]}
    </span>
  );
}

/* ------------------------------------------------------------------ Topo */

function Topo({ p }: { p: Produto }) {
  return (
    <section data-tema="claro" className="relative -mt-16 overflow-x-clip pt-16">
      <div className="container-page grid items-center gap-10 pb-16 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24">
        <div className="relative order-2 lg:order-1">
          <Foto
            nome={p.topo.foto}
            prioridade
            alt={p.topo.alt}
            posicao={p.topo.posicao}
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="aspect-[4/5] rounded-[2rem] sm:aspect-square lg:aspect-[4/5]"
          />
          <div
            className="pop-in absolute -bottom-8 right-3 w-[38%] max-w-[13.5rem] sm:right-6 lg:-right-8"
            style={{ "--d": "700ms" } as CSSProperties}
          >
            <SequenciaCelular
              telas={p.heroTelas ?? ["pago", "avaliacao"]}
              legenda={false}
              prioridade
              sizes="220px"
            />
          </div>
          <p className="absolute left-4 top-4 max-w-[55%] rounded-full bg-white/90 px-3 py-1.5 text-[0.75rem] font-medium leading-tight text-[#021E34] backdrop-blur sm:left-6 sm:top-6">
            No celular: telas reais da Tipe de hoje (pagamento e avaliação)
          </p>
        </div>
        <div className="order-1 lg:order-2">
          <p className="flex flex-wrap items-center gap-3 font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong">
            <p.icone className="h-5 w-5" aria-hidden />
            {p.rotulo}
            <SeloStatus status={p.status} className="text-foreground" />
          </p>
          <Palavras
            as="h1"
            imediato
            delay={150}
            className="mt-4 block font-display text-[clamp(2.4rem,1.2rem+4.4vw,5.2rem)] font-normal leading-[0.98] tracking-[-0.05em] text-balance"
          >
            {p.titulo}
          </Palavras>
          <p
            className="hero-in mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:text-xl"
            style={{ "--d": "450ms" } as CSSProperties}
          >
            {p.texto}
          </p>
          <div
            className="hero-in mt-8 flex flex-wrap gap-3"
            style={{ "--d": "600ms" } as CSSProperties}
          >
            <BotaoPrincipal href="#avisar" vivo>
              Quero ser avisado
            </BotaoPrincipal>
            <BotaoSecundario href="/restaurante-fundador">Sou restaurante</BotaoSecundario>
          </div>
          <ul
            className="hero-in mt-8 flex flex-wrap gap-2"
            style={{ "--d": "750ms" } as CSSProperties}
          >
            {(
              [
                ["hoje", "#hoje"],
                ["planejado", "#planejado"],
                ["demo", "#demonstracao"],
              ] as const
            ).map(([t, href]) => (
              <li key={t}>
                <a href={href} className="inline-flex min-h-11 items-center">
                  <SeloTipo tipo={t} className={t === "demo" ? "text-foreground" : undefined} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Disponível hoje */

function Hoje({ p }: { p: Produto }) {
  const f = p.fluxoReal;
  if (!f) return null;
  return (
    <Secao tema="claro" id="hoje">
      <div className="container-page">
        <SeloTipo tipo="hoje" />
        <Titulo titulo={f.titulo} texto={f.texto} className="mt-2" />
        <ol className="sem-barra -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {f.telas.map((t, i) => (
            <Reveal
              as="li"
              key={t.tela}
              delay={i * 110}
              className="w-[62vw] max-w-[16rem] shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <CelularReal
                tela={t.tela}
                alt={t.alt}
                sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 62vw"
                className="mx-auto max-w-[15rem]"
              />
              <p className="mt-5 flex items-baseline gap-2 font-display text-[1.2rem] tracking-[-0.02em]">
                <span className="text-[0.85rem] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t.t}
              </p>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">{t.d}</p>
            </Reveal>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Hoje a avaliação vai só para o restaurante. Publicar avaliações na descoberta do Guest é
          um recurso futuro e vai valer apenas para quem avaliar com consentimento.
        </p>
      </div>
    </Secao>
  );
}

/* --------------------------------------------------- Planejado no Guest */

const PLANEJADO: {
  icone: typeof Search;
  t: string;
  d: string;
  foto: "japones" | "cena-familia" | "cena-casal";
  posicao: string;
}[] = [
  {
    icone: Search,
    t: "Descobrir",
    d: "Encontrar restaurantes perto de você, por tipo de cozinha, ocasião e horário.",
    foto: "japones",
    posicao: "50% 45%",
  },
  {
    icone: CalendarCheck,
    t: "Reservar",
    d: "Ver a disponibilidade do restaurante e garantir a mesa, com confirmação.",
    foto: "cena-familia",
    posicao: "50% 40%",
  },
  {
    icone: Star,
    t: "Avaliações na descoberta",
    d: "Notas de quem pagou pela Tipe e aceitou publicar, depois de moderadas.",
    foto: "cena-casal",
    posicao: "50% 35%",
  },
];

function Planejado() {
  return (
    <Secao tema="escuro" id="planejado">
      <div className="container-page">
        <SeloTipo tipo="planejado" className="bg-white text-[#021E34]" />
        <Titulo
          className="mt-2"
          titulo="Descobrir, reservar, voltar."
          texto="O que o Tipe Guest vai acrescentar. Nada disto está disponível ainda, e nenhuma reserva é feita por esta página."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-3">
          {PLANEJADO.map((it, i) => (
            <Reveal as="li" key={it.t} delay={i * 110} className="flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem]">
                <Foto
                  nome={it.foto}
                  alt=""
                  posicao={it.posicao}
                  sizes="(min-width: 640px) 31vw, 92vw"
                  className="h-full w-full"
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#021E34]/85 px-3 py-1 text-[0.75rem] font-medium text-white backdrop-blur">
                  <Clock className="h-3.5 w-3.5 text-[#0FC9BD]" aria-hidden /> Planejado
                </span>
              </div>
              <p className="mt-5 flex items-center gap-2 font-display text-[1.4rem] tracking-[-0.02em]">
                <it.icone className="h-5 w-5 text-[#0FC9BD]" aria-hidden />
                {it.t}
              </p>
              <p className="mt-1.5 text-[0.98rem] leading-relaxed text-muted-foreground">{it.d}</p>
            </Reveal>
          ))}
        </ul>
        <p className="mt-10 flex items-start gap-2 text-[0.95rem] text-muted-foreground">
          <Bookmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Também planejados: restaurantes salvos, histórico de visitas e relacionamento com os
          lugares de que você gosta.
        </p>
      </div>
    </Secao>
  );
}

/* -------------------------------------------------------- Demonstração */

function Demonstracao() {
  return (
    <Secao tema="claro" id="demonstracao" className="!pb-0">
      <div className="container-page">
        <div className="rounded-[2rem] border-2 border-dashed border-foreground/20 p-7 sm:p-10">
          <SeloTipo tipo="demo" className="text-foreground" />
          <h2 className="mt-4 max-w-3xl font-display text-[clamp(1.6rem,1.1rem+2vw,2.6rem)] font-normal leading-[1.08] tracking-[-0.035em]">
            As telas do Guest entram aqui quando a demonstração existir.
          </h2>
          <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground">
            A demonstração do Tipe Guest ainda está em construção. Por isso esta página não mostra
            nenhuma tela de busca ou reserva: quando ela estiver pronta, as telas virão dela, sempre
            identificadas como “Demonstração · dados fictícios”.
          </p>
        </div>
      </div>
    </Secao>
  );
}

/* --------------------------------------------- Jornada com o Tipe Pay */

const JORNADA: { t: string; tipo?: Tipo }[] = [
  { t: "Descobrir", tipo: "planejado" },
  { t: "Escolher", tipo: "planejado" },
  { t: "Reservar", tipo: "planejado" },
  { t: "Visitar o restaurante" },
  { t: "Pagar com o Tipe Pay", tipo: "hoje" },
  { t: "Avaliar", tipo: "hoje" },
  { t: "Voltar", tipo: "planejado" },
];

function ComTipePay() {
  return (
    <Secao tema="claro" id="tipe-pay">
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <Titulo
            rotulo="Junto com o Tipe Pay"
            titulo="Da descoberta à conta paga, no mesmo caminho."
            texto="O Guest vai se ligar ao Tipe Pay, que já funciona hoje. E o Tipe Pay não depende do Guest: quem paga pelo QR Code da mesa continua pagando sem instalar nada, com Apple Pay, Google Pay, Pix ou no estabelecimento."
          />
          <a
            href="/produtos/pay"
            className="mt-8 inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-4"
          >
            Conhecer o Tipe Pay <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <ol className="relative space-y-3 border-l-2 border-foreground/10 pl-6">
          {JORNADA.map((j, i) => (
            <Reveal
              as="li"
              key={j.t}
              delay={i * 70}
              className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background-muted px-5 py-4"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[2.05rem] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-background",
                  j.tipo === "hoje" ? "bg-[#0FC9BD]" : j.tipo ? "bg-[#021E34]" : "bg-foreground/30",
                )}
              />
              <span className="font-display text-[1.15rem] tracking-[-0.02em]">
                <span className="mr-2 text-[0.85rem] text-muted-foreground">{i + 1}</span>
                {j.t}
              </span>
              {j.tipo && <SeloTipo tipo={j.tipo} />}
            </Reveal>
          ))}
        </ol>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------ Benefícios */

function ColunaBeneficio({
  icone: Icone,
  titulo,
  itens,
}: {
  icone: typeof Compass;
  titulo: string;
  itens: [Tipo, string][];
}) {
  return (
    <div className="rounded-[1.75rem] bg-background-muted p-7 sm:p-9">
      <Icone className="h-7 w-7 text-brand-strong" aria-hidden />
      <h3 className="mt-4 font-display text-[1.7rem] font-normal tracking-[-0.03em]">{titulo}</h3>
      <ul className="mt-5 space-y-4">
        {itens.map(([tipo, t]) => (
          <li key={t} className="flex flex-col gap-1.5">
            <SeloTipo tipo={tipo} />
            <span className="text-[1rem] leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Beneficios() {
  return (
    <Secao tema="claro" id="beneficios" className="!pt-0">
      <div className="container-page">
        <Titulo
          rotulo="Para os dois lados da mesa"
          titulo="Bom para quem come. Bom para quem serve."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <ColunaBeneficio
            icone={UserRound}
            titulo="Para o cliente"
            itens={[
              ["hoje", "Pagar pelo QR Code sem instalar nada e avaliar o atendimento na hora."],
              ["hoje", "Ser chamado pelo nome ao voltar à mesma mesa, no mesmo aparelho."],
              ["planejado", "Achar um lugar para hoje e reservar sem telefonar."],
              ["planejado", "Guardar os restaurantes favoritos e o histórico de visitas."],
            ]}
          />
          <ColunaBeneficio
            icone={Store}
            titulo="Para o restaurante"
            itens={[
              ["hoje", "Avaliações ligadas ao garçom que atendeu, logo depois do pagamento."],
              ["planejado", "Ser encontrado por quem procura onde comer."],
              ["planejado", "Receber reservas dentro do painel que já usa."],
              ["planejado", "Chamar de volta quem já gostou da casa, com consentimento."],
            ]}
          />
        </div>
      </div>
    </Secao>
  );
}

/* ---------------------------------------------- Quando chega + Fundador */

function QuandoChega() {
  return (
    <Secao tema="escuro" id="quando">
      <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Titulo
            rotulo="Quando chega"
            titulo="Na próxima fase da Tipe."
            texto="O Tipe Guest ainda não tem data de lançamento. Enquanto isso, a Tipe segue cuidando do que já funciona: o pagamento na mesa, a gorjeta e a avaliação."
          />
        </div>
        <div
          id="fundador"
          className="flex flex-col justify-between rounded-[1.75rem] bg-[#0FC9BD] p-7 text-[#021E34] sm:p-9"
        >
          <div>
            <p className="font-display text-[1.1rem] tracking-[-0.02em]">Para restaurantes</p>
            <p className="mt-3 font-display text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] leading-[1.08] tracking-[-0.035em]">
              Faça parte dos primeiros restaurantes a construir o futuro da Tipe.
            </p>
            <p className="mt-3 text-[1rem] leading-relaxed text-[#021E34]/80">
              O programa Restaurante Fundador começa com a Tipe que já funciona hoje, na mesa e no
              caixa.
            </p>
          </div>
          <a
            href="/restaurante-fundador"
            className="com-fios mt-8 inline-flex min-h-12 w-fit items-center gap-2.5 rounded-full bg-[#021E34] pl-7 pr-6 font-medium text-white"
          >
            Conhecer o Restaurante Fundador <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------ Avisar */

function Avisar() {
  return (
    <section data-tema="claro" id="avisar" className="scroll-mt-16 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="relative mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.25rem] bg-[linear-gradient(120deg,#021E34_0%,#03465a_55%,#0b9e94_100%)] px-6 py-12 text-white sm:px-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
        <div>
          <Palavras
            as="h2"
            className="block max-w-[14ch] font-display text-[clamp(2.3rem,1.3rem+3.6vw,4.4rem)] font-normal leading-[0.98] tracking-[-0.045em]"
          >
            Quero ser avisado.
          </Palavras>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
            Deixe seu nome e e-mail. A Tipe avisa quando o Tipe Guest chegar, uma vez, sem sequência
            de propaganda.
          </p>
        </div>
        <FormularioInteresse origem="tipe-guest" />
      </div>
    </section>
  );
}

export function PaginaGuest({ p }: { p: Produto }): ReactNode {
  return (
    <>
      <Topo p={p} />
      <Hoje p={p} />
      <Planejado />
      <Demonstracao />
      <ComTipePay />
      <Beneficios />
      <QuandoChega />
      <Avisar />
      <ListaDuvidas faq={duvidasDe(p)} />
      <Relacionados p={p} />
    </>
  );
}
