/**
 * Página de produto no formato das páginas de produto da sunday: topo dividido
 * (foto com card de interface + título), abas curtas, faixa na cor da marca com
 * o celular, seção escura com fatos e fotos, passos no celular, recursos,
 * dúvidas, produtos relacionados e a faixa final.
 */
import type { CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MesaViva } from "@/components/tipe/MesaViva";
import { PhoneShot } from "@/components/tipe/landing/PhoneShot";
import { Palavras, Reveal } from "@/components/tipe/landing/motion";
import totemMesa from "@/assets/marca/totem-mesa.webp";
import { cn } from "@/lib/utils";
import { AbasDemo, type ItemAba } from "./AbasDemo";
import { Experimente } from "./Experimente";
import { Foto, type NomeFoto } from "./Foto";
import { PRODUTOS, type Produto } from "./produtos";
import { BotaoPrincipal, BotaoSecundario, FaixaCta, Secao, Titulo } from "./Site";

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

function Topo({ p }: { p: Produto }) {
  return (
    <section data-tema="claro" className="relative -mt-16 pt-16">
      <div className="container-page grid items-center gap-10 pb-14 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20">
        <div className="relative order-2 lg:order-1">
          <Foto
            nome={p.foto}
            prioridade
            alt={p.altFoto}
            posicao={p.posicao}
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="aspect-[4/5] rounded-[2rem] sm:aspect-[5/5] lg:aspect-[4/5]"
          />
          <CartaoInterface
            cartao={p.cartao}
            className="pop-in absolute bottom-5 left-5 w-[min(78%,19rem)] sm:bottom-8 sm:left-8"
            style={{ "--d": "700ms" } as CSSProperties}
          />
        </div>
        <div className="order-1 lg:order-2">
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
              {p.status === "disponivel" ? "Começar o teste grátis" : "Quero saber primeiro"}
            </BotaoPrincipal>
            <BotaoSecundario href="/simulador">Testar o simulador</BotaoSecundario>
          </div>
        </div>
      </div>
    </section>
  );
}

function Abas({ p }: { p: Produto }) {
  const itens: ItemAba[] = p.beneficios.map((b, i) => ({
    id: `${p.slug}-${i}`,
    rotulo: b.t,
    titulo: b.t,
    texto: b.d,
    foto: b.foto,
    posicao: b.posicao,
    altFoto: "",
    tela: b.tela,
    altTela: b.tela ? `Tela real da Tipe: ${b.t.toLowerCase()}` : undefined,
    extra: b.tela ? undefined : <CartaoInterface cartao={p.cartao} />,
  }));
  return (
    <Secao tema="claro" ariaLabel="Destaques" className="!pt-6 sm:!pt-10">
      <div className="container-page">
        <Titulo rotulo="Na prática" titulo={`O que muda com o ${p.nome}.`} className="mb-10 lg:mb-14" />
        <AbasDemo itens={itens} />
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
            <PhoneShot tela={p.banda.tela} alt={p.banda.altTela} sizes="240px" />
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

const MOSAICO: Record<string, NomeFoto[]> = {
  pay: ["boteco", "cafe", "pizzaria", "bistro"],
  order: ["hamburgueria", "boteco", "pizzaria", "japones"],
  staff: ["bistro", "boteco", "japones", "cafe"],
  kitchen: ["japones", "pizzaria", "hamburgueria", "boteco"],
  restaurant: ["integracoes", "cafe", "bistro", "pizzaria"],
  ai: ["restaurant", "cafe", "boteco", "bistro"],
  guest: ["pay", "cafe", "pizzaria", "boteco"],
};

function Fatos({ p }: { p: Produto }) {
  const fotos = MOSAICO[p.slug] ?? MOSAICO["pay"]!;
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
          {fotos.map((n, i) => (
            <Foto
              key={n + i}
              nome={n}
              alt=""
              sizes="(min-width: 1024px) 26vw, 46vw"
              className={cn("rounded-[1.5rem]", i % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/5]", i === 1 && "mt-10")}
            />
          ))}
        </div>
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
export function CardProduto({ p, className }: { p: Produto; className?: string }) {
  const tela = p.beneficios.find((b) => b.tela)?.tela;
  return (
    <a
      href={`/produtos/${p.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[1.75rem] bg-background-muted transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1",
        className,
      )}
      aria-label={`${p.nome}: ${p.resumo}`}
    >
      <div className="p-6 pb-5">
        <p className="flex items-center gap-2 text-[0.95rem] text-muted-foreground">
          <p.icone className="h-4 w-4" />
          {p.nome}
          {p.status === "em-breve" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">Em breve</span>
          )}
        </p>
        <p className="mt-3 font-display text-[1.45rem] font-normal leading-[1.1] tracking-[-0.03em]">
          {p.titulo}
        </p>
      </div>
      <div className="relative mx-3 mb-3 mt-auto overflow-hidden rounded-[1.25rem]">
        <Foto
          nome={p.foto}
          alt=""
          posicao={p.posicao}
          sizes="(min-width: 1024px) 24rem, 80vw"
          className="aspect-[4/4.2]"
        />
        {tela ? (
          <div className="absolute -bottom-[38%] right-[8%] w-[44%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-3">
            <PhoneShot tela={tela} alt="" sizes="180px" />
          </div>
        ) : (
          <CartaoInterface
            cartao={p.cartao}
            className="absolute inset-x-3 bottom-3 origin-bottom scale-[0.92] p-3.5 transition-transform duration-700 group-hover:scale-95 sm:p-4"
          />
        )}
      </div>
    </a>
  );
}

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
      <DemonstracaoPay p={p} />
      <Recursos p={p} />
      <Duvidas p={p} />
      <Relacionados p={p} />
      <FaixaCta />
    </>
  );
}
