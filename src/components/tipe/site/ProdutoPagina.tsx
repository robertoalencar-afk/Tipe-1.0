/**
 * Página de produto no formato das páginas de produto da sunday: topo dividido
 * (foto com card de interface + título), abas curtas, faixa na cor da marca com
 * o celular, seção escura com fatos e fotos, passos no celular, recursos,
 * dúvidas, produtos relacionados e a faixa final.
 */
import type { CSSProperties } from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { TrilhoProdutos } from "./TrilhoProdutos";
import { MesaViva } from "./produto/MesaViva";
import { Palavras, Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { LiveSimulator } from "@/components/tipe/landing/LiveSimulator";
import { DICAS_SIMULADOR, SimuladorDoProduto } from "./produto/Simuladores";
import { Foto, type NomeFoto } from "./Foto";
import { CardProduto } from "./CardProduto";
import { duvidasDe, PRODUTOS, type Painel, type Produto } from "./produtos";
import { BotaoPrincipal, BotaoSecundario, Secao, Titulo } from "./Site";
import { SequenciaCelular } from "./produto/SequenciaCelular";
import { AbasProduto, type AbaProduto } from "./produto/AbasProduto";
import { ConversaLebre, PainelLebre, type ConversaId } from "./produto/Lebre";
import { CelularReal, TabletSalao } from "./produto/TelaReal";
import { TopoStaff } from "./produto/TopoStaff";
import { Tablet } from "./Dispositivo";
import { BaixaAutomatica } from "./produto/BaixaAutomatica";
import { SimuladorGuest } from "./guest/SimuladorGuest";
import {
  GuestAvaliacoesSecao,
  GuestComoReservar,
  GuestFundadorSecao,
  GuestManagerSecao,
  GuestPaySecao,
  GuestVitrine,
} from "./guest/GuestSecoes";
import { PaginaOrder } from "./order/PaginaOrder";
import { LANCAMENTO_PADRAO, type EstadoLancamento } from "@/lib/tipe/launch-state";

export function SeloStatus({
  status,
  className,
}: {
  status: Produto["status"];
  className?: string;
}) {
  if (status === "disponivel") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-current/30 px-3 py-1 text-xs font-medium",
        className,
      )}
    >
      Em breve
    </span>
  );
}

export function CartaoInterface({
  cartao,
  className,
  style,
}: {
  cartao: Produto["cartao"];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border border-white/60 bg-white/85 p-4 text-[oklch(0.15_0_0)] shadow-[0_30px_60px_-25px_rgb(0_0_0/0.45)] backdrop-blur-xl sm:p-5",
        className,
      )}
      style={style}
    >
      <p className="text-xs font-medium text-[oklch(0.45_0_0)]">{cartao.titulo}</p>
      <ul className="mt-3 space-y-2 text-[0.92rem]">
        {cartao.linhas.map(([a, b]) => (
          <li key={a} className="flex items-baseline justify-between gap-4">
            <span className="text-[oklch(0.35_0_0)]">{a}</span>
            <span className="money font-medium">{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#0FC9BD]/15 px-3 py-2 text-sm font-medium text-[#03665f]">
        <Check className="h-4 w-4" strokeWidth={3} />
        {cartao.rodape}
      </p>
      {cartao.ilustracao && (
        <p className="mt-2 text-center text-[0.7rem] text-[oklch(0.5_0_0)]">
          Ilustração · em breve
        </p>
      )}
    </div>
  );
}

/** Card honesto para o que ainda não existe: nada de tela que finja ser real. */
function CartaoEmDesenvolvimento({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/60 bg-white/[0.88] p-4 text-[#021E34] shadow-[0_30px_60px_-25px_rgb(0_0_0/0.45)] backdrop-blur-md sm:p-5">
      <p className="flex w-fit items-center gap-1.5 rounded-full bg-[#021E34] px-2.5 py-1 text-[0.72rem] font-medium text-white">
        <Clock className="h-3.5 w-3.5 text-[#0FC9BD]" aria-hidden /> Em desenvolvimento
      </p>
      <p className="mt-3 font-display text-[1.15rem] leading-tight tracking-[-0.02em]">{titulo}</p>
      <p className="mt-1.5 text-[0.88rem] leading-snug text-[#021E34]/70">
        Ainda não está disponível. Quem entrar no teste grátis fica sabendo primeiro.
      </p>
    </div>
  );
}

function TextoTopo({ p }: { p: Produto }) {
  return (
    <>
      <p className="flex items-center gap-3 font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong">
        <p.icone className="h-5 w-5" />
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
        <BotaoPrincipal>
          {p.status === "disponivel" ? "Solicitar demonstração" : "Quero saber primeiro"}
        </BotaoPrincipal>
        <BotaoSecundario href="#simulador">Testar o simulador</BotaoSecundario>
      </div>
    </>
  );
}

/** O que flutua sobre a foto do topo: a conversa da Lebre, uma tela real ou o card de interface. */
function SobreFoto({ p }: { p: Produto }) {
  const atraso = { "--d": "700ms" } as CSSProperties;
  if (p.slug === "ai")
    return (
      <div
        className="pop-in absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-8 sm:left-8 sm:w-[min(84%,22rem)]"
        style={atraso}
      >
        <ConversaLebre id="salao" compacta />
        <p className="mt-2 text-[0.72rem] text-white/80 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">
          Conversa demonstrativa
        </p>
      </div>
    );
  if (p.slug === "guest")
    return (
      <div
        className="pop-in absolute bottom-[-10%] right-4 w-[38%] max-w-[12.5rem] sm:right-6"
        style={atraso}
      >
        <CelularReal
          tela="pago"
          alt="Tela real de pagamento realizado, com os botões Agradecer Joyce com gorjeta e Avaliar atendimento"
          sizes="220px"
          prioridade
        />
      </div>
    );
  return (
    <CartaoInterface
      cartao={p.cartao}
      className="pop-in absolute bottom-5 left-5 w-[min(78%,19rem)] sm:bottom-8 sm:left-8"
      style={atraso}
    />
  );
}

function Topo({ p }: { p: Produto }) {
  if (p.slug === "staff")
    return (
      <TopoStaff>
        <TextoTopo p={p} />
      </TopoStaff>
    );
  return (
    <section data-tema="claro" className="relative -mt-16 overflow-x-clip pt-16">
      <div className="container-page grid items-center gap-10 pb-14 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20">
        <div className="relative order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-[2rem]">
            <Foto
              nome={p.topo.foto}
              prioridade
              alt={p.topo.alt}
              posicao={p.topo.posicao}
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="aspect-[4/5] rounded-[2rem] sm:aspect-[5/5] lg:aspect-[4/5]"
            />
            {!p.heroTelas && <SobreFoto p={p} />}
          </div>
          {/* O celular sai da foto pelo canto, sem cobrir rosto: as telas reais em sequência. */}
          {p.heroTelas && (
            <div
              className="pop-in absolute -bottom-8 right-3 w-[38%] max-w-[13.5rem] sm:right-6 lg:-right-8"
              style={{ "--d": "700ms" } as CSSProperties}
            >
              <SequenciaCelular telas={p.heroTelas} legenda={false} prioridade sizes="220px" />
            </div>
          )}
        </div>
        <div className="order-1 lg:order-2">
          <TextoTopo p={p} />
        </div>
      </div>
    </section>
  );
}

const CONVERSA: Record<Painel, ConversaId> = {
  "lebre-salao": "salao",
  "lebre-acao": "acao",
  "lebre-anexo": "anexo",
};

function Abas({ p }: { p: Produto }) {
  const itens: AbaProduto[] = p.beneficios.map((b, i) => ({
    id: `${p.slug}-${i}`,
    rotulo: b.t,
    texto: b.d,
    foto: b.foto,
    posicao: b.posicao,
    altFoto: "",
    painel: b.painel ? <PainelLebre id={CONVERSA[b.painel]} /> : undefined,
    tela: b.telaReal,
    altTela: b.telaReal ? `Tela real do app do cliente: ${b.t.toLowerCase()}` : undefined,
    extra:
      b.telaReal || b.painel ? undefined : b.tabletKds ? (
        <Tablet
          tela="kds"
          alt="Tela da cozinha da Tipe com os pedidos por mesa e o tempo de cada um"
          className="ml-auto w-[82%] max-w-[18rem] sm:w-full"
          sizes="18rem"
        />
      ) : b.tabletSalao ? (
        <TabletSalao
          alt="Tela real do Salão no painel da Tipe: mesa 12 encerrada, 100% paga"
          className="ml-auto w-[78%] max-w-[16rem] sm:w-full"
        />
      ) : b.emDesenvolvimento ? (
        <CartaoEmDesenvolvimento titulo={b.t} />
      ) : (
        <CartaoInterface cartao={p.cartao} />
      ),
  }));
  return (
    <Secao tema="claro" ariaLabel="Destaques" className="!pt-6 sm:!pt-10">
      <div className="container-page">
        <Titulo
          rotulo="Na prática"
          titulo={`O que muda com o ${p.nome}.`}
          className="mb-10 lg:mb-14"
        />
        <AbasProduto itens={itens} />
      </div>
    </Secao>
  );
}

/**
 * Simulador do produto (04/11): no lugar da faixa verde com o celular saindo da borda,
 * o aparelho inteiro para tocar. Pay usa o simulador real da conta; Staff, Kitchen,
 * Restaurant e a Lebre têm simuladores próprios (produto/Simuladores.tsx).
 */
function Banda({ p }: { p: Produto }) {
  const dicas = DICAS_SIMULADOR[p.slug] ?? [];
  const tablet = p.slug === "kitchen" || p.slug === "restaurant";
  return (
    <section id="simulador" data-tema="claro" className="scroll-mt-16 px-4 sm:px-6">
      <div
        className={cn(
          "mx-auto grid max-w-7xl items-center gap-10 rounded-[2.25rem] bg-[#EEF4F3] px-6 py-12 text-[#021E34] sm:px-12 sm:py-16 lg:gap-12 lg:px-16",
          tablet ? "lg:grid-cols-[0.85fr_1.15fr]" : "lg:grid-cols-[1fr_auto]",
        )}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.8rem] font-medium text-[#03665f] ring-1 ring-[#021E34]/10">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0FC9BD]" /> Simulador · toque para testar
          </p>
          <Palavras
            as="h2"
            className="mt-5 block max-w-[16ch] font-display text-[clamp(2.2rem,1.3rem+3.2vw,4rem)] font-normal leading-[0.98] tracking-[-0.045em]"
          >
            {p.banda.titulo}
          </Palavras>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#021E34]/75">{p.banda.texto}</p>
          {dicas.length > 0 && (
            <ol className="mt-8 grid max-w-md gap-2.5">
              {dicas.map((d, i) => (
                <li key={d} className="flex items-center gap-3 text-[0.98rem]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#021E34] text-xs font-medium text-[#0FC9BD]">
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 max-w-md text-sm text-[#021E34]/55">
            Restaurante fictício, só no seu navegador. Nada é enviado.
          </p>
        </div>
        <Reveal delay={100} className={cn("w-full", !tablet && "lg:w-[19rem]")}>
          {p.slug === "pay" ? (
            <LiveSimulator className="max-w-[19rem]" />
          ) : (
            <SimuladorDoProduto slug={p.slug} />
          )}
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Seção escura própria de cada produto: onde ele acontece, com duas cenas grandes do
 * casting (ou a conversa da Lebre) e os fatos do produto. Substitui o mosaico de fotos
 * que se repetia igual em todas as páginas.
 */
function Cenario({ p }: { p: Produto }) {
  const c = p.cenario;
  return (
    <Secao tema="escuro">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-20">
          <Titulo rotulo="Onde acontece" titulo={c.titulo} texto={c.texto} />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4 lg:grid-cols-2">
            {p.fatos.map((f, i) => (
              <Reveal key={f.t} delay={i * 100}>
                <dt className="font-display text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-normal leading-none tracking-[-0.05em]">
                  {f.v}
                </dt>
                <dd className="mt-2 max-w-[15rem] text-[0.92rem] text-muted-foreground">{f.t}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-16">
          {c.itens.map((it, i) => (
            <Reveal key={it.legenda} delay={i * 120} as="figure" className="m-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] sm:aspect-[5/6]">
                {it.painel ? (
                  <PainelLebre id={CONVERSA[it.painel]} className="h-full" />
                ) : it.foto ? (
                  <Foto
                    nome={it.foto}
                    alt=""
                    posicao={it.posicao}
                    sizes="(min-width: 640px) 46vw, 92vw"
                    className="h-full w-full transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03]"
                  />
                ) : null}
              </div>
              <figcaption className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted-foreground">
                {it.legenda}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </Secao>
  );
}

/** Só no Tipe Reserva: as telas reais do app do cliente, em sequência. */
function FluxoReal({ p }: { p: Produto }) {
  if (!p.fluxoReal) return null;
  const f = p.fluxoReal;
  return (
    <Secao tema="claro">
      <div className="container-page">
        <Titulo rotulo="Passo a passo" titulo={f.titulo} texto={f.texto} />
        <ol className="sem-barra -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-5 lg:gap-6">
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
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 40vw, 62vw"
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
      </div>
    </Secao>
  );
}

/**
 * Só no Tipe Pay (V6): a história da mesa (Mesa Viva), o lado do restaurante (baixa
 * automática e pagamentos do caixa) e o simulador real para tocar.
 */
function DemonstracaoPay({ p }: { p: Produto }) {
  if (p.slug !== "pay") return null;
  return (
    <>
      <MesaViva />
      <BaixaAutomatica p={p} />
    </>
  );
}

const TONS = [
  "bg-[#021E34] text-white",
  "bg-[#0FC9BD] text-[#021E34]",
  "bg-background-muted text-foreground",
  "bg-[#e6faf8] text-[#021E34]",
];

function Recursos({ p }: { p: Produto }) {
  return (
    <Secao tema="claro">
      <div className="container-page">
        <Titulo rotulo="Recursos" titulo="Feito para o turno ficar mais leve." />
        <ul
          className={cn(
            "sem-barra -mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0",
            p.recursos.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
          )}
        >
          {p.recursos.map((r, i) => (
            <Reveal
              as="li"
              key={r.t}
              delay={(i % 3) * 110}
              className={cn(
                "flex min-h-[13rem] w-[72vw] max-w-[20rem] shrink-0 snap-start flex-col justify-between rounded-[1.75rem] p-6 transition-transform duration-500 hover:-translate-y-1 sm:w-auto sm:max-w-none sm:min-h-[15rem] sm:p-7",
                TONS[i % TONS.length],
              )}
            >
              <r.icone className="h-7 w-7" />
              <div>
                <p className="font-display text-2xl font-medium leading-tight tracking-[-0.03em]">
                  {r.t}
                </p>
                <p className="mt-2 text-[0.98rem] leading-relaxed opacity-75">{r.d}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Secao>
  );
}

function Duvidas({ p }: { p: Produto }) {
  return <ListaDuvidas faq={duvidasDe(p)} />;
}

/** Lista de dúvidas no formato da página de produto (também usada pela página do Tipe Order). */
export function ListaDuvidas({ faq }: { faq: [string, string][] }) {
  if (!faq.length) return null;
  return (
    <Secao tema="claro" className="!pt-0">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Titulo titulo="Dúvidas." />
        <div className="divide-y divide-border border-y border-border">
          {faq.map(([q, a]) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.2rem] font-medium tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-500 group-open:rotate-180" />
              </summary>
              <p className="pb-5 pr-10 leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Secao>
  );
}

/** Card de produto no formato da sunday: nome e promessa em cima, foto com a tela real embaixo. */
export function Relacionados({ p }: { p: Produto }) {
  const outros = PRODUTOS.filter((o) => o.slug !== p.slug).slice(0, 6);
  return (
    <Secao tema="escuro">
      <TrilhoProdutos
        titulo={<Titulo rotulo="Tudo conversa" titulo="Uma plataforma, da mesa ao caixa." />}
        produtos={outros}
      />
    </Secao>
  );
}

export function ProdutoPagina({ p, estado }: { p: Produto; estado?: EstadoLancamento | null }) {
  if (p.slug === "order")
    return (
      <PaginaOrder p={p} estado={estado ?? LANCAMENTO_PADRAO["order"] ?? "em-desenvolvimento"} />
    );
  if (p.slug === "guest")
    return (
      <>
        <Topo p={p} />
        <Abas p={p} />
        <GuestVitrine />
        <SimuladorGuest />
        <GuestComoReservar />
        <GuestManagerSecao />
        <GuestPaySecao />
        <GuestAvaliacoesSecao />
        <GuestFundadorSecao />
        <Duvidas p={p} />
        <Relacionados p={p} />
      </>
    );
  return (
    <>
      <Topo p={p} />
      <Abas p={p} />
      <Banda p={p} />
      {p.slug === "pay" ? (
        <DemonstracaoPay p={p} />
      ) : (
        <>
          <Cenario p={p} />
          <FluxoReal p={p} />
        </>
      )}
      <Recursos p={p} />
      <Duvidas p={p} />
      <Relacionados p={p} />
    </>
  );
}
