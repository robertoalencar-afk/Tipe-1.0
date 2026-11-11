/**
 * Página comercial do Tipe Order (/order), dentro da mesma moldura das outras
 * páginas de produto. O que muda com o estado de lançamento (CTA, selo, resposta de
 * "Quando estará disponível?", título do formulário) vem de TEXTOS_LANCAMENTO.
 *
 * Regras que esta página não pode contrariar: o Order é módulo adicional do Tipe Pay e usa o
 * mesmo QR Code; a conta se paga com Apple Pay, Google Pay, Pix ou no estabelecimento (sem
 * cartão digitado); dividir → pagar → gorjeta extra opcional como segundo pagamento. Nada de
 * números de mercado, datas ou integração com PDV que não exista.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
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
import { SimuladorMultiformato } from "./SimuladorMultiformato";
import { EscolhaAtendimento, SeloDisponibilidade } from "./EscolhaAtendimento";
import { MonteSuaOperacao } from "./MonteSuaOperacao";
import { DEFINICOES, ORDEM_SELETOR, TEXTO_DISPONIBILIDADE, type Modalidade } from "@/lib/tipe/order/modalidades";
import { FAQ_ORDER } from "./faq";
import { CriarPratoDemo } from "./CriarPratoDemo";

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
            Seu restaurante tem um jeito de atender. A Tipe acompanha.
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
              href="#simulador"
              className="com-fios inline-flex min-h-12 items-center gap-2 rounded-full border border-foreground/25 px-7 text-[1rem] font-medium"
            >
              Experimentar o simulador <ArrowDown className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <p
            className="hero-in mt-6 max-w-md text-sm leading-relaxed text-muted-foreground"
            style={{ "--d": "700ms" } as CSSProperties}
          >
            {t.fase} Pratos e preços de exemplo.
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
    rotulo: "Cardápio em stories",
  },
  {
    n: "03",
    t: "Peça",
    d: "Adiciona, escreve uma observação e envia. O pedido vai para a cozinha e entra na conta da mesa.",
    icone: UtensilsCrossed,
    tela: "order-cozinha",
    alt: "Pedido enviado: 2 itens foram para a cozinha e já estão na conta da mesa (dados de exemplo)",
    rotulo: "Direto para a cozinha",
  },
  {
    n: "04",
    t: "Pague",
    d: "Na aba Pagar está a conta com tudo o que foi pedido. Dinheiro ou maquininha no local; Pix, Apple Pay e Google Pay em piloto.",
    icone: Wallet,
    tela: "order-conta",
    alt: "Conta da Mesa 12 com o pastel de camarão, o serviço e o botão Pagar R$ 74,80 (dados de exemplo)",
    rotulo: "A conta da mesa",
  },
];

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

/* ---------------------------------------------------------- Tudo conectado */

const ETAPAS: { nome: string; href: string; icone: typeof ChefHat; d: string }[] = [
  {
    nome: "Tipe Order",
    href: `#${ANCORA_FORM}`,
    icone: Smartphone,
    d: "Mesa, balcão, totem ou pulseira: o pedido nasce no formato da casa.",
  },
  {
    nome: "Tipe Cozinha",
    href: "/cozinha",
    icone: ChefHat,
    d: "O pedido aparece na tela da cozinha e do bar.",
  },
  {
    nome: "Tipe Equipe",
    href: "/equipe",
    icone: Users,
    d: "A equipe libera, acompanha e localiza o cliente no evento.",
  },
  {
    nome: "Tipe Pay",
    href: "/pay",
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
          texto="Seja qual for o formato, o pedido segue sozinho pelos módulos da Tipe. Ninguém digita de novo o que o cliente já escolheu, e o dinheiro passa só pelo Tipe Pay."
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

/* ---------------------------------------------------------- Integrações e disponibilidade */

const INTEGRACOES: { t: string; d: string; estado: "operacional" | "piloto" | "desenvolvimento" | "planejada" }[] = [
  { t: "Tipe Pay", d: "Único caminho do dinheiro: dinheiro ou maquininha no local; Pix, Apple Pay e Google Pay em piloto.", estado: "piloto" },
  { t: "Tipe Cozinha e Tipe Equipe", d: "Pedidos por mesa, senha ou comanda na mesma tela.", estado: "operacional" },
  { t: "Painel de senhas na TV", d: "Balcão e retirada mostram a senha pronta em qualquer tela com navegador.", estado: "piloto" },
  { t: "Terminal de pagamento no totem", d: "Pagamento na maquininha, sem passar pelo caixa, quando o terminal for homologado.", estado: "desenvolvimento" },
  { t: "Canais de delivery", d: "Integração com marketplaces e WhatsApp. Hoje o canal entra só como origem do pedido.", estado: "planejada" },
  { t: "PDV e emissão fiscal", d: "Sem integração com PDV ou nota fiscal. O Order não substitui o seu sistema fiscal.", estado: "planejada" },
];

function Disponibilidade() {
  return (
    <Secao tema="claro" id="disponibilidade">
      <div className="container-page">
        <Titulo
          rotulo="Integrações e disponibilidade"
          titulo="O que já funciona. E o que ainda não."
          texto="Nada aqui é promessa. Cada linha reflete o que está no produto hoje. O simulador acima mostra o fluxo de todas as modalidades, inclusive as que ainda estão em desenvolvimento."
        />
        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-12">
          <div>
            <h3 className="font-display text-[1.15rem] tracking-[-0.02em] text-brand-strong">Modalidades</h3>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {ORDEM_SELETOR.map((m: Modalidade) => {
                const d = DEFINICOES[m];
                return (
                  <li key={m} className="flex items-start justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="font-medium">{d.nome}</p>
                      <p className="mt-0.5 text-[0.85rem] leading-relaxed text-muted-foreground">{TEXTO_DISPONIBILIDADE[d.disponibilidade].curto}</p>
                    </div>
                    <SeloDisponibilidade d={d.disponibilidade} className="shrink-0" />
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-[1.15rem] tracking-[-0.02em] text-brand-strong">Integrações</h3>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {INTEGRACOES.map((i) => (
                <li key={i.t} className="flex items-start justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium">{i.t}</p>
                    <p className="mt-0.5 text-[0.85rem] leading-relaxed text-muted-foreground">{i.d}</p>
                  </div>
                  <SeloDisponibilidade d={i.estado} className="shrink-0" />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.8rem] text-muted-foreground">
              Sem aplicativo para o cliente: tudo abre no navegador. O Tipe Reserva (reservas) é outro produto e está em breve.
            </p>
          </div>
        </div>
      </div>
    </Secao>
  );
}

export function PaginaOrder({ p, estado }: { p: Produto; estado: EstadoLancamento }) {
  const t = TEXTOS_LANCAMENTO[estado];
  const [modalidade, setModalidade] = useState<Modalidade>("mesas");
  const faq: [string, string][] = [[PERGUNTA_QUANDO, t.quando], ...FAQ_ORDER];
  return (
    <>
      <Topo p={p} estado={estado} />
      <EscolhaAtendimento modalidade={modalidade} onModalidade={setModalidade} />
      <SimuladorMultiformato modalidade={modalidade} onModalidade={setModalidade} />
      <CardapioStories />
      <CriarPratoDemo />
      <TudoConectado />
      <MonteSuaOperacao estado={estado} />
      <Disponibilidade />
      <ListaDuvidas faq={faq} />
      <Contato estado={estado} />
      <Relacionados p={p} />
    </>
  );
}
