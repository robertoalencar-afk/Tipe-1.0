/**
 * Página de produto no formato das páginas de produto da sunday: topo dividido
 * (foto com card de interface + título), abas curtas, faixa na cor da marca com
 * o celular, seção escura com fatos e fotos, passos no celular, recursos,
 * dúvidas, produtos relacionados e a faixa final.
 */
import type { CSSProperties } from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { MesaViva } from "@/components/tipe/MesaViva";
import { Palavras, Reveal } from "@/components/tipe/landing/motion";
import totemMesa from "@/assets/marca/totem-mesa.webp";
import { cn } from "@/lib/utils";
import { Experimente } from "./Experimente";
import { Foto, type NomeFoto } from "./Foto";
import { CardProduto } from "./CardProduto";
import { PRODUTOS, type Painel, type Produto } from "./produtos";
import { BotaoPrincipal, BotaoSecundario, FaixaCta, Secao, Titulo } from "./Site";
import { AbasProduto, type AbaProduto } from "./produto/AbasProduto";
import { CelularLebre, ConversaLebre, PainelLebre, type ConversaId } from "./produto/Lebre";
import { CelularReal } from "./produto/TelaReal";
import { TopoStaff } from "./produto/TopoStaff";

export function SeloStatus({ status, className }: { status: Produto["status"]; className?: string }) {
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
      <div className="hero-in mt-8 flex flex-wrap gap-3" style={{ "--d": "600ms" } as CSSProperties}>
        <BotaoPrincipal>{p.status === "disponivel" ? "Começar o teste grátis" : "Quero saber primeiro"}</BotaoPrincipal>
        <BotaoSecundario href="/simulador">Testar o simulador</BotaoSecundario>
      </div>
    </>
  );
}

/** O que flutua sobre a foto do topo: a conversa da Lebre, uma tela real ou o card de interface. */
function SobreFoto({ p }: { p: Produto }) {
  const atraso = { "--d": "700ms" } as CSSProperties;
  if (p.slug === "ai")
    return (
      <div className="pop-in absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-8 sm:left-8 sm:w-[min(84%,22rem)]" style={atraso}>
        <ConversaLebre id="salao" compacta />
        <p className="mt-2 text-[0.72rem] text-white/80 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">Conversa demonstrativa</p>
      </div>
    );
  if (p.slug === "guest")
    return (
      <div className="pop-in absolute bottom-[-10%] right-4 w-[40%] max-w-[13.5rem] sm:right-8" style={atraso}>
        <CelularReal tela="avaliacao" alt="Tela real de avaliação depois do pagamento: Como foi seu atendimento?" sizes="220px" prioridade />
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
    <section data-tema="claro" className="relative -mt-16 pt-16">
      <div className="container-page grid items-center gap-10 pb-14 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20">
        <div className="relative order-2 overflow-hidden rounded-[2rem] lg:order-1">
          <Foto
            nome={p.foto}
            prioridade
            alt={p.altFoto}
            posicao={p.posicao}
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="aspect-[4/5] rounded-[2rem] sm:aspect-[5/5] lg:aspect-[4/5]"
          />
          <SobreFoto p={p} />
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
  "lebre-limite": "limite",
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
    extra: b.telaReal || b.painel ? undefined : b.emDesenvolvimento ? <CartaoEmDesenvolvimento titulo={b.t} /> : <CartaoInterface cartao={p.cartao} />,
  }));
  return (
    <Secao tema="claro" ariaLabel="Destaques" className="!pt-6 sm:!pt-10">
      <div className="container-page">
        <Titulo rotulo="Na prática" titulo={`O que muda com o ${p.nome}.`} className="mb-10 lg:mb-14" />
        <AbasProduto itens={itens} />
      </div>
    </Secao>
  );
}

function Banda({ p }: { p: Produto }) {
  return (
    <section data-tema="claro" className="px-4 sm:px-6">
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.25rem] bg-[#0FC9BD] px-7 pt-12 text-[#021E34] sm:px-12 lg:grid-cols-[1fr_1fr] lg:gap-6 lg:px-16 lg:pt-0">
        <div className="lg:py-20">
          <Palavras
            as="h2"
            className="block max-w-[16ch] font-display text-[clamp(2.2rem,1.3rem+3.2vw,4rem)] font-normal leading-[0.98] tracking-[-0.045em]"
          >
            {p.banda.titulo}
          </Palavras>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#021E34]/80">
            {p.banda.texto}
          </p>
        </div>
        <div className="relative mx-auto flex h-full w-full max-w-md items-end justify-center gap-4 self-end lg:pt-14">
          <Reveal className="relative z-10 w-[55%] translate-y-6" delay={100}>
            {p.banda.lebre ? (
              <CelularLebre />
            ) : (
              <CelularReal tela={p.banda.telaReal ?? "conta"} alt={p.banda.altTela} sizes="240px" />
            )}
          </Reveal>
          <Reveal className="mb-10 w-[46%] shrink-0" delay={300}>
            <div className="rotate-[-4deg]">
              <img
                src={totemMesa}
                alt="Suporte de mesa da Tipe com QR Code da Mesa 12"
                width={700}
                height={409}
                loading="lazy"
                className="block w-full rounded-xl shadow-[0_20px_40px_-15px_rgb(0_0_0/0.4)]"
              />
              <div
                aria-hidden
                className="mx-auto h-5 w-[86%] rounded-b-md bg-[linear-gradient(180deg,#d9b88f,#b48b5e)]"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * Mosaico da seção escura. Sem repetir foto que já aparece no topo ou nas abas da
 * mesma página. "lebre" é um painel desenhado (conversa da Lebre) no lugar de foto.
 */
const MOSAICO: Record<string, (NomeFoto | "lebre")[]> = {
  pay: ["boteco", "cafe", "pizzaria", "bistro"],
  order: ["cafe", "boteco", "pizzaria", "japones"],
  staff: ["bistro", "boteco", "japones", "cafe"],
  kitchen: ["cafe", "pizzaria", "hamburgueria", "boteco"],
  restaurant: ["mesa", "cafe", "bistro", "pizzaria"],
  ai: ["gestor", "lebre"],
  guest: ["pay", "amigos", "boteco", "bistro"],
};

function Fatos({ p }: { p: Produto }) {
  const itens = MOSAICO[p.slug] ?? MOSAICO["pay"]!;
  const dupla = itens.length === 2;
  return (
    <Secao tema="escuro">
      <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Titulo rotulo="Na prática" titulo="Mais tempo para o que importa no salão." />
          <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10">
            {p.fatos.map((f, i) => (
              <Reveal key={f.t} delay={i * 120}>
                <dt className="font-display text-[clamp(2.6rem,1.6rem+3vw,4.2rem)] font-normal leading-none tracking-[-0.05em]">
                  {f.v}
                </dt>
                <dd className="mt-3 max-w-[16rem] text-[0.98rem] text-muted-foreground">{f.t}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {itens.map((n, i) => {
            const forma = dupla ? "aspect-[3/4.6]" : i % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/5]";
            const deslocar = i === 1 && "mt-10";
            if (n === "lebre")
              return (
                <div key={n + i} className={cn("overflow-hidden rounded-[1.5rem] [&_p]:text-[0.8rem] [&_div]:text-[0.8rem]", forma, deslocar)}>
                  <PainelLebre id="acao" className="!p-4 sm:!p-5" />
                </div>
              );
            return (
              <Foto
                key={n + i}
                nome={n}
                alt=""
                sizes="(min-width: 1024px) 26vw, 46vw"
                className={cn("rounded-[1.5rem]", forma, deslocar)}
              />
            );
          })}
        </div>
      </div>
    </Secao>
  );
}

/** Só no Tipe Guest: as telas reais do app do cliente, em sequência. */
function FluxoReal({ p }: { p: Produto }) {
  if (!p.fluxoReal) return null;
  const f = p.fluxoReal;
  return (
    <Secao tema="claro">
      <div className="container-page">
        <Titulo rotulo="Telas reais" titulo={f.titulo} texto={f.texto} />
        <ol className="sem-barra -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {f.telas.map((t, i) => (
            <Reveal as="li" key={t.tela} delay={i * 110} className="w-[62vw] max-w-[16rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <CelularReal tela={t.tela} alt={t.alt} sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 62vw" className="mx-auto max-w-[15rem]" />
              <p className="mt-5 flex items-baseline gap-2 font-display text-[1.2rem] tracking-[-0.02em]">
                <span className="text-[0.85rem] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
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

/** Só no Tipe Pay: a história da mesa (Mesa Viva) e o simulador real para tocar. */
function DemonstracaoPay({ p }: { p: Produto }) {
  if (p.slug !== "pay") return null;
  return (
    <>
      <MesaViva />
      <Experimente />
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
        <ul className="sem-barra -mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
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
  if (!p.faq.length) return null;
  return (
    <Secao tema="claro" className="!pt-0">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Titulo titulo="Dúvidas." />
        <div className="divide-y divide-border border-y border-border">
          {p.faq.map(([q, a]) => (
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
function Relacionados({ p }: { p: Produto }) {
  const outros = PRODUTOS.filter((o) => o.slug !== p.slug).slice(0, 6);
  return (
    <Secao tema="escuro">
      <div className="container-page">
        <Titulo rotulo="Tudo conversa" titulo="Uma plataforma, da mesa ao caixa." />
      </div>
      <div className="sem-barra mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
        {outros.map((o) => (
          <CardProduto key={o.slug} p={o} className="w-[80vw] max-w-[22rem] shrink-0 snap-start" />
        ))}
      </div>
    </Secao>
  );
}

export function ProdutoPagina({ p }: { p: Produto }) {
  return (
    <>
      <Topo p={p} />
      <Abas p={p} />
      <Banda p={p} />
      <Fatos p={p} />
      <FluxoReal p={p} />
      <DemonstracaoPay p={p} />
      <Recursos p={p} />
      <Duvidas p={p} />
      <Relacionados p={p} />
      <FaixaCta />
    </>
  );
}
