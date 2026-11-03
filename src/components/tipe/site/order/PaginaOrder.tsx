/**
 * Página comercial do Tipe Order (/produtos/order), dentro da mesma moldura das outras
 * páginas de produto. O que muda com o estado de lançamento (CTA, selo, resposta de
 * "Quando estará disponível?", título do formulário) vem de TEXTOS_LANCAMENTO.
 *
 * Regras que esta página não pode contrariar: o Order é módulo adicional do Tipe Pay e usa o
 * mesmo QR Code; a conta se paga com Apple Pay, Google Pay, Pix ou no estabelecimento (sem
 * cartão digitado); dividir → pagar → gorjeta extra opcional como segundo pagamento. Nada de
 * números de mercado, datas ou integração com PDV que não exista.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  Box,
  Check,
  ChefHat,
  Clock,
  ClipboardList,
  MessageSquareText,
  QrCode,
  ReceiptText,
  RefreshCw,
  ScanLine,
  Smartphone,
  UtensilsCrossed,
  Users,
  Wallet,
} from "lucide-react";
import totemMesa from "@/assets/marca/totem-mesa.webp";
import { Palavras, Reveal } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { PERGUNTA_QUANDO, TEXTOS_LANCAMENTO, type EstadoLancamento } from "@/lib/tipe/launch-state";
import { trackProduto } from "@/lib/tipe/tracking";
import { SetaFios } from "../Bigode";
import { Foto } from "../Foto";
import { Secao, Titulo } from "../Site";
import { CelularReal, type TelaReal } from "../produto/TelaReal";
import { SequenciaCelular } from "../produto/SequenciaCelular";
import { duvidasDe, type Produto } from "../produtos";
import { ListaDuvidas, Relacionados } from "../ProdutoPagina";
import { FormularioOrder } from "./FormularioOrder";

const ANCORA_FORM = "quero-o-order";

/** Selo do estado (nada quando disponível). */
function SeloEstado({ estado, className }: { estado: EstadoLancamento; className?: string }) {
  const selo = TEXTOS_LANCAMENTO[estado].selo;
  if (!selo) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1 text-xs font-medium",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden /> {selo}
    </span>
  );
}

/** Botão principal: leva ao formulário e registra o clique (só com consentimento). */
function BotaoEstado({
  estado,
  local,
  className,
}: {
  estado: EstadoLancamento;
  local: string;
  className?: string;
}) {
  return (
    <a
      href={`#${ANCORA_FORM}`}
      onClick={() => trackProduto("produto_cta", { produto: "order", estado, local })}
      className={cn(
        "btn-tema com-fios inline-flex min-h-12 items-center gap-2.5 rounded-full py-3 pl-7 pr-6 text-[1rem] font-medium",
        className,
      )}
    >
      {TEXTOS_LANCAMENTO[estado].cta}
      <SetaFios />
    </a>
  );
}

function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "w-fit rounded-full bg-[#021E34]/80 px-2.5 py-1 text-[0.72rem] font-medium text-white backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ Topo */

function Topo({ p, estado }: { p: Produto; estado: EstadoLancamento }) {
  const t = TEXTOS_LANCAMENTO[estado];
  return (
    <section data-tema="claro" className="relative -mt-16 overflow-x-clip pt-16">
      <div className="container-page grid items-center gap-10 pb-16 pt-6 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24">
        <div className="relative order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-[2rem]">
            <Foto
              nome={p.topo.foto}
              prioridade
              alt={p.topo.alt}
              posicao={p.topo.posicao}
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="aspect-[4/5] rounded-[2rem] sm:aspect-square lg:aspect-[4/5]"
            />
            {/* O mesmo QR leva aos dois caminhos: pedir e pagar. */}
            <div
              className="pop-in absolute bottom-4 left-4 w-[min(56%,15.5rem)] rounded-[1.25rem] border border-white/60 bg-white/90 p-3.5 text-[#021E34] shadow-[0_30px_60px_-25px_rgb(0_0_0/0.45)] backdrop-blur-md sm:bottom-8 sm:left-8 sm:p-4"
              style={{ "--d": "700ms" } as CSSProperties}
            >
              <p className="flex items-center gap-2 text-[0.8rem] font-medium">
                <QrCode className="h-4 w-4 text-[#03665f]" aria-hidden /> Mesa 12 · um QR Code
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[0.85rem] font-medium">
                <span className="flex items-center justify-center gap-1.5 rounded-full bg-[#021E34] py-2 text-white">
                  <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden /> Pedir
                </span>
                <span className="flex items-center justify-center gap-1.5 rounded-full bg-[#0FC9BD] py-2 text-[#021E34]">
                  <Wallet className="h-3.5 w-3.5" aria-hidden /> Pagar
                </span>
              </div>
            </div>
          </div>
          <div
            className="pop-in absolute -bottom-8 right-3 w-[40%] max-w-[13.5rem] sm:right-6 lg:-right-8"
            style={{ "--d": "700ms" } as CSSProperties}
          >
            <SequenciaCelular
              telas={["order-story-baiao", "order-story-peixe", "order-cozinha", "order-conta"]}
              legenda={false}
              prioridade
              sizes="220px"
            />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="flex flex-wrap items-center gap-3 font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong">
            <p.icone className="h-5 w-5" aria-hidden />
            {p.rotulo}
            <SeloEstado estado={estado} className="font-sans text-foreground" />
          </p>
          <Palavras
            as="h1"
            imediato
            delay={150}
            className="mt-4 block font-display text-[clamp(2.6rem,1.2rem+5vw,5.6rem)] font-normal leading-[0.98] tracking-[-0.05em] text-balance"
          >
            Peça sem esperar.
          </Palavras>
          <p
            className="hero-in mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:text-xl"
            style={{ "--d": "450ms" } as CSSProperties}
          >
            O mesmo QR Code da mesa que mostra a conta abre o cardápio. O cliente escolhe, pede pelo
            celular e o pedido vai direto para a cozinha e para a conta da mesa. Sem baixar
            aplicativo e sem esperar alguém passar.
          </p>
          <div
            className="hero-in mt-8 flex flex-wrap gap-3"
            style={{ "--d": "600ms" } as CSSProperties}
          >
            <BotaoEstado estado={estado} local="topo" />
            <a
              href="#como-funciona"
              className="com-fios inline-flex min-h-12 items-center gap-2 rounded-full border border-foreground/25 px-7 text-[1rem] font-medium"
            >
              Ver como funciona <ArrowDown className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <p
            className="hero-in mt-6 max-w-md text-sm leading-relaxed text-muted-foreground"
            style={{ "--d": "700ms" } as CSSProperties}
          >
            {t.fase} As telas são do Tipe Order de verdade, com dados de exemplo.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- Um QR Code. Toda a experiência. */

const PASSOS: {
  n: string;
  t: string;
  d: string;
  icone: typeof ScanLine;
  tela?: TelaReal;
  alt: string;
  rotulo: string;
}[] = [
  {
    n: "01",
    t: "Escaneie",
    d: "O cliente aponta a câmera para o QR Code do suporte da mesa. Abre no navegador.",
    icone: ScanLine,
    alt: "Suporte de mesa da Tipe com o QR Code da Mesa 12",
    rotulo: "Suporte de mesa da Tipe",
  },
  {
    n: "02",
    t: "Escolha",
    d: "O cardápio abre em stories: cada prato em foto de tela cheia. É só tocar para ver o próximo.",
    icone: ClipboardList,
    tela: "order-story-baiao",
    alt: "Cardápio em stories com a foto do Baião de dois e o botão Adicionar por R$ 42,00 (dados de exemplo)",
    rotulo: "Tela do Tipe Order · dados de exemplo",
  },
  {
    n: "03",
    t: "Peça",
    d: "Adiciona, escreve uma observação e envia. O pedido vai para a cozinha e entra na conta da mesa.",
    icone: UtensilsCrossed,
    tela: "order-cozinha",
    alt: "Pedido enviado: 2 itens foram para a cozinha e já estão na conta da mesa (dados de exemplo)",
    rotulo: "Tela do Tipe Order · dados de exemplo",
  },
  {
    n: "04",
    t: "Pague",
    d: "Na aba Pagar está a conta com tudo o que foi pedido. Apple Pay, Google Pay, Pix ou no estabelecimento.",
    icone: Wallet,
    tela: "order-conta",
    alt: "Conta da Mesa 12 com o pastel de camarão, o serviço e o botão Pagar R$ 74,80 (dados de exemplo)",
    rotulo: "Tela do Tipe Order · dados de exemplo",
  },
];

function Experiencia() {
  return (
    <Secao tema="claro" id="como-funciona">
      <div className="container-page">
        <Titulo
          rotulo="Como funciona"
          titulo="Um QR Code. Toda a experiência."
          texto="Do primeiro pedido ao pagamento, o cliente não sai da mesma página nem baixa nada."
        />
        <ol className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:mt-16 lg:grid-cols-4">
          {PASSOS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 110} className="flex flex-col">
              <figure className="m-0">
                <div className="relative flex aspect-[390/700] w-full items-end overflow-hidden rounded-[1.25rem] bg-background-muted sm:rounded-[1.75rem]">
                  {s.tela ? (
                    <CelularReal
                      tela={s.tela}
                      alt={s.alt}
                      sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 62vw"
                      className="mx-auto w-[78%] translate-y-[14%]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center p-6">
                      <img
                        src={totemMesa}
                        alt={s.alt}
                        width={700}
                        height={409}
                        loading="lazy"
                        className="w-full -rotate-3 rounded-xl shadow-[0_20px_40px_-15px_rgb(0_0_0/0.4)]"
                      />
                    </div>
                  )}
                  <Rotulo className="absolute left-2 top-2 max-w-[calc(100%-1rem)] text-[0.62rem] leading-tight sm:left-3 sm:top-3 sm:text-[0.72rem]">
                    {s.rotulo}
                  </Rotulo>
                </div>
                <figcaption className="mt-5">
                  <p className="flex items-baseline gap-2 font-display text-[1.15rem] tracking-[-0.02em] sm:text-[1.35rem]">
                    <span className="text-[0.85rem] text-muted-foreground">{s.n}</span>
                    {s.t}
                  </p>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted-foreground sm:text-[0.98rem]">
                    {s.d}
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ol>
      </div>
    </Secao>
  );
}

/* ---------------------------------------------------------- Cardápio em stories */

const STORIES: { tela: TelaReal; t: string; alt: string }[] = [
  {
    tela: "order-story-baiao",
    t: "Pratos",
    alt: "Story do Baião de dois, com feijão-verde, queijo coalho e nata (dados de exemplo)",
  },
  {
    tela: "order-story-peixe",
    t: "Saindo da brasa",
    alt: "Story do Peixe na brasa com o selo Saindo da brasa e 1 no pedido (dados de exemplo)",
  },
  {
    tela: "order-story-bebidas",
    t: "Bebidas",
    alt: "Story do Suco de caju, copo de 400 ml, por R$ 9,50 (dados de exemplo)",
  },
];

function CardapioStories() {
  return (
    <Secao tema="escuro">
      <div className="container-page grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <div>
          <Titulo
            rotulo="Cardápio em stories"
            titulo="O prato entra pelos olhos."
            texto="Cada prato aparece em foto de tela cheia, como nos stories. O cliente passa para o lado, vê o que está saindo agora e adiciona sem sair da tela."
          />
          <ul className="mt-8 space-y-3 text-[1rem] leading-snug">
            {[
              "Toque para o próximo, segure para pausar",
              "Selo para o que está saindo da cozinha agora",
              "Alergênicos informados pelo restaurante",
              "Quantidade no pedido sempre à vista",
            ].map((it) => (
              <li key={it} className="flex gap-3">
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#0FC9BD]"
                  strokeWidth={2.5}
                  aria-hidden
                />
                {it}
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:gap-5">
          {STORIES.map((s, i) => (
            <Reveal
              as="li"
              key={s.tela}
              delay={i * 120}
              className={cn("flex flex-col", i === 1 && "lg:-translate-y-8")}
            >
              <CelularReal tela={s.tela} alt={s.alt} sizes="(min-width: 1024px) 15vw, 30vw" />
              <p className="mt-3 text-center text-[0.85rem] text-muted-foreground sm:text-[0.95rem]">
                {s.t}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </Secao>
  );
}

/* ---------------------------------------------------------- Pay x Order */

function PayEOrder({ estado }: { estado: EstadoLancamento }) {
  const t = TEXTOS_LANCAMENTO[estado];
  const colunas = [
    {
      nome: "Tipe Pay",
      papel: "Para pagar",
      selo: "Disponível",
      itens: [
        "Conta da mesa ao vivo no celular",
        "Dividir por item, em partes iguais ou por valor",
        "Apple Pay, Google Pay, Pix ou pagar no estabelecimento",
        "Gorjeta extra opcional depois, como um segundo pagamento",
      ],
      href: "/produtos/pay",
      escuro: true,
    },
    {
      nome: "Tipe Order",
      papel: "Para pedir · módulo adicional",
      selo: t.selo ?? "Disponível",
      itens: [
        "Cardápio do restaurante no mesmo QR Code",
        "Pedido com quantidade e observação por item",
        "O pedido vai para a cozinha",
        "O que foi pedido entra na conta da mesa",
      ],
      href: `#${ANCORA_FORM}`,
      escuro: false,
    },
  ];
  return (
    <Secao tema="claro">
      <div className="container-page">
        <Titulo
          rotulo="Pay e Order"
          titulo="O Pay fecha a conta. O Order abre o pedido."
          texto="O Tipe Order é um módulo adicional do Tipe Pay. Não é outro aplicativo nem outro QR Code: o cliente encontra o cardápio e a conta no mesmo lugar."
        />
        <div className="relative mt-12 grid gap-4 md:grid-cols-2 md:gap-5 lg:mt-16">
          {colunas.map((c, i) => (
            <Reveal
              key={c.nome}
              delay={i * 120}
              className={cn(
                "flex flex-col rounded-[1.75rem] p-7 sm:p-9",
                c.escuro ? "bg-[#021E34] text-white" : "bg-[#e6faf8] text-[#021E34]",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-[1.7rem] tracking-[-0.03em]">{c.nome}</p>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    c.escuro ? "bg-[#0FC9BD] text-[#021E34]" : "border border-[#021E34]/30",
                  )}
                >
                  {c.selo}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 text-[0.95rem]",
                  c.escuro ? "text-white/70" : "text-[#021E34]/70",
                )}
              >
                {c.papel}
              </p>
              <ul className="mt-6 space-y-3 text-[1rem] leading-snug">
                {c.itens.map((it) => (
                  <li key={it} className="flex gap-3">
                    <Check
                      className={cn(
                        "mt-0.5 h-5 w-5 shrink-0",
                        c.escuro ? "text-[#0FC9BD]" : "text-[#03665f]",
                      )}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    {it}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-[0.95rem] text-muted-foreground">
          <QrCode className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden />
          Um suporte na mesa, um QR Code, os dois módulos. Sem cartão digitado na tela.
        </p>
      </div>
    </Secao>
  );
}

/* ---------------------------------------------------------- Tudo conectado */

const ETAPAS: { nome: string; href: string; icone: typeof ChefHat; d: string }[] = [
  {
    nome: "Order",
    href: `#${ANCORA_FORM}`,
    icone: Smartphone,
    d: "O cliente pede pelo celular, na mesa.",
  },
  {
    nome: "Cozinha",
    href: "/produtos/kitchen",
    icone: ChefHat,
    d: "O pedido aparece na tela da cozinha e do bar.",
  },
  {
    nome: "Staff",
    href: "/produtos/staff",
    icone: Users,
    d: "A equipe acompanha a mesa e leva o pedido.",
  },
  {
    nome: "Pay",
    href: "/produtos/pay",
    icone: ReceiptText,
    d: "Tudo o que foi pedido já está na conta para pagar.",
  },
];

function TudoConectado() {
  return (
    <Secao tema="escuro">
      <div className="container-page">
        <Titulo
          rotulo="Tudo conectado"
          titulo="Do pedido ao pagamento, sem papel no meio."
          texto="O pedido feito na mesa segue sozinho pelos módulos da Tipe. Ninguém digita de novo o que o cliente já escolheu."
        />
        <ol className="mt-10 grid grid-cols-2 gap-3 lg:mt-16 lg:grid-cols-4 lg:gap-0">
          {ETAPAS.map((e, i) => (
            <Reveal as="li" key={e.nome} delay={i * 110} className="relative flex">
              <a
                href={e.href}
                className="group flex min-h-[10rem] w-full flex-col justify-between gap-6 rounded-[1.5rem] bg-background-muted p-5 sm:p-6 ring-1 ring-border transition-shadow hover:ring-foreground/40 lg:mr-8"
              >
                <e.icone className="h-7 w-7 text-[#0FC9BD]" aria-hidden />
                <span>
                  <span className="block font-display text-[1.35rem] tracking-[-0.03em] sm:text-[1.6rem]">
                    {e.nome}
                  </span>
                  <span className="mt-1.5 block text-[0.88rem] leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                    {e.d}
                  </span>
                </span>
              </a>
              {i < ETAPAS.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute right-1 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block"
                />
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </Secao>
  );
}

/* ---------------------------------------------------------- Benefícios */

const BENEFICIOS: { icone: typeof Clock; t: string; d: string }[] = [
  {
    icone: Clock,
    t: "Ninguém espera para pedir",
    d: "O cliente pede quando quer, sem precisar chamar alguém.",
  },
  {
    icone: MessageSquareText,
    t: "Pedido escrito, com observação",
    d: "“Sem cebola” chega por escrito, do jeito que o cliente pediu.",
  },
  {
    icone: ReceiptText,
    t: "Conta sem digitação",
    d: "O que foi pedido entra na conta da mesa. Sem item esquecido.",
  },
  {
    icone: RefreshCw,
    t: "Pedir mais é um toque",
    d: "A segunda rodada sai da mesa, sem esperar o garçom passar.",
  },
  {
    icone: Users,
    t: "Equipe livre para atender",
    d: "Menos ida e volta com bloquinho, mais tempo para o salão.",
  },
  {
    icone: UtensilsCrossed,
    t: "Cardápio sempre igual ao da casa",
    d: "Item que acabou sai do cardápio; nada para reimprimir.",
  },
];

function Beneficios({ p }: { p: Produto }) {
  return (
    <Secao tema="escuro" className="!pt-0">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-20">
          <Titulo rotulo="Benefícios" titulo="Menos espera na mesa. Menos ruído no salão." />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8">
            {p.fatos.map((f, i) => (
              <Reveal key={f.t} delay={i * 100}>
                <dt className="font-display text-[clamp(2.4rem,1.6rem+2.4vw,3.6rem)] font-normal leading-none tracking-[-0.05em]">
                  {f.v}
                </dt>
                <dd className="mt-2 max-w-[15rem] text-[0.95rem] text-muted-foreground">{f.t}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-4">
          {BENEFICIOS.map((b, i) => (
            <Reveal
              as="li"
              key={b.t}
              delay={(i % 3) * 110}
              className="rounded-[1.5rem] bg-background-muted p-5 ring-1 ring-border sm:p-6"
            >
              <b.icone className="h-6 w-6 text-[#0FC9BD]" aria-hidden />
              <p className="mt-3 font-display text-[1.2rem] sm:mt-5 sm:text-[1.3rem] leading-tight tracking-[-0.02em]">
                {b.t}
              </p>
              <p className="mt-2 text-[0.97rem] leading-relaxed text-muted-foreground">{b.d}</p>
            </Reveal>
          ))}
        </ul>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {p.cenario.itens.map((it, i) =>
            it.foto ? (
              <Reveal key={it.legenda} delay={i * 120} as="figure" className="m-0">
                <Foto
                  nome={it.foto}
                  alt=""
                  posicao={it.posicao}
                  sizes="(min-width: 640px) 46vw, 92vw"
                  className="aspect-[5/4] rounded-[1.75rem]"
                />
                <figcaption className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted-foreground">
                  {it.legenda}
                </figcaption>
              </Reveal>
            ) : null,
          )}
        </div>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------ Tipe 3D Studio e Ver na minha mesa */

function Futuro() {
  const itens = [
    {
      icone: Box,
      t: "Tipe 3D Studio",
      d: "Fotos do prato viram um modelo em 3D para o cardápio, que o cliente gira no celular.",
    },
    {
      icone: Smartphone,
      t: "Ver na minha mesa",
      d: "Pela câmera do celular, o cliente vê o prato em tamanho real sobre a própria mesa antes de pedir.",
    },
  ];
  return (
    <Secao tema="claro">
      <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <Titulo
            rotulo="No laboratório"
            titulo="O prato antes de chegar."
            texto="Duas ideias que a Tipe está desenvolvendo para o cardápio. Ainda não existem no produto e não têm data."
          />
          <figure className="m-0 mt-8 flex items-end gap-4">
            <CelularReal
              tela="order-story-3d"
              alt="Protótipo do cardápio em 3D: um abacate que o cliente gira no celular (em desenvolvimento)"
              sizes="180px"
              className="w-[42%] max-w-[11rem]"
            />
            <figcaption className="max-w-[13rem] pb-2 text-[0.9rem] leading-relaxed text-muted-foreground">
              Protótipo do story em 3D, em teste com dados de exemplo.
            </figcaption>
          </figure>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {itens.map((it, i) => (
            <Reveal
              as="li"
              key={it.t}
              delay={i * 120}
              className="flex min-h-[15rem] flex-col justify-between rounded-[1.75rem] border border-dashed border-foreground/25 p-6 sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <it.icone className="h-7 w-7 text-brand-strong" aria-hidden />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#021E34] px-2.5 py-1 text-[0.72rem] font-medium text-white">
                  <Clock className="h-3.5 w-3.5 text-[#0FC9BD]" aria-hidden /> Em desenvolvimento
                </span>
              </div>
              <div>
                <p className="mt-6 font-display text-[1.5rem] leading-tight tracking-[-0.03em]">
                  {it.t}
                </p>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-muted-foreground">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Secao>
  );
}

/* ---------------------------------------------------------- CTA final */

function Contato({ estado }: { estado: EstadoLancamento }) {
  const t = TEXTOS_LANCAMENTO[estado];
  return (
    <section
      data-tema="claro"
      id={ANCORA_FORM}
      className="scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="relative mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.25rem] bg-[linear-gradient(120deg,#021E34_0%,#03465a_55%,#0b8f87_100%)] px-5 py-12 text-white sm:px-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-16">
        <div>
          <SeloEstado estado={estado} className="text-white" />
          <Palavras
            as="h2"
            className="mt-5 block max-w-[14ch] font-display text-[clamp(2.3rem,1.3rem+3.6vw,4.4rem)] font-normal leading-[0.98] tracking-[-0.045em]"
          >
            {t.tituloFormulario}
          </Palavras>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">{t.fase}</p>
          <p className="mt-3 max-w-md leading-relaxed text-white/70">
            Deixe seu contato e a equipe da Tipe fala com você pelo WhatsApp. Sem compromisso.
          </p>
        </div>
        <FormularioOrder key={estado} estado={estado} />
      </div>
    </section>
  );
}

export function PaginaOrder({ p, estado }: { p: Produto; estado: EstadoLancamento }) {
  const t = TEXTOS_LANCAMENTO[estado];
  const faq: [string, string][] = [
    [PERGUNTA_QUANDO, t.quando],
    ...duvidasDe(p).filter(([q]) => q !== PERGUNTA_QUANDO),
  ].slice(0, 5) as [string, string][];
  return (
    <>
      <Topo p={p} estado={estado} />
      <Experiencia />
      <CardapioStories />
      <PayEOrder estado={estado} />
      <TudoConectado />
      <Beneficios p={p} />
      <Futuro />
      <ListaDuvidas faq={faq} />
      <Contato estado={estado} />
      <Relacionados p={p} />
    </>
  );
}
