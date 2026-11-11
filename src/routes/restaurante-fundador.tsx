/**
 * Página comercial do programa Restaurante Fundador (Fase 3 do projeto Tipe Guest, item
 * "Landing"). Ligada à adoção da Tipe de hoje, não à disponibilidade do Tipe Guest.
 * Sem escassez artificial (nada de vagas limitadas ou contagem), sem preço, desconto ou
 * vantagem prometida: as regras do programa estão em definição.
 *
 * Rota /restaurante-fundador. NUNCA /fundador, que é a área da equipe Tipe (super-admin).
 * O cadastro grava em restaurant_leads com origin_page "restaurante-fundador" (/admin/leads).
 */
import { createFileRoute } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { ArrowRight, Check, FileText, MessageCircle, QrCode, Store } from "lucide-react";
import { Palavras, Reveal } from "@/components/tipe/landing/motion";
import { Foto } from "@/components/tipe/site/Foto";
import { FormularioInteresse } from "@/components/tipe/site/FormularioInteresse";
import {
  BotaoPrincipal,
  BotaoSecundario,
  Secao,
  SitePage,
  Titulo,
} from "@/components/tipe/site/Site";
import { CelularReal } from "@/components/tipe/site/produto/TelaReal";

const SITE = "https://tipe.digital";
const TITLE = "Restaurante Fundador · Construa com a Tipe | Tipe";
const DESC =
  "Programa Restaurante Fundador: para restaurantes que adotam a Tipe hoje, com pagamento na mesa pelo QR Code, e querem ajudar a construir as próximas partes da Tipe. Regras em definição.";

export const Route = createFileRoute("/restaurante-fundador")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/restaurante-fundador` },
    ],
    links: [{ rel: "canonical", href: `${SITE}/restaurante-fundador` }],
  }),
  component: RestauranteFundador,
});

const HOJE: { icone: typeof QrCode; t: string; d: string }[] = [
  {
    icone: QrCode,
    t: "Pagamento na mesa",
    d: "O cliente abre a conta pelo QR Code, divide se quiser e paga com Apple Pay, Google Pay, Pix ou no estabelecimento.",
  },
  {
    icone: Check,
    t: "Gorjeta e avaliação",
    d: "Depois da conta paga, gorjeta extra opcional e avaliação ligada a quem atendeu.",
  },
  {
    icone: Store,
    t: "Painel do restaurante",
    d: "Salão, pagamentos e equipe no painel que a Tipe já entrega hoje.",
  },
];

const PASSOS: { icone: typeof FileText; t: string; d: string }[] = [
  {
    icone: FileText,
    t: "Você se cadastra",
    d: "Só o essencial: nome, restaurante e WhatsApp.",
  },
  {
    icone: MessageCircle,
    t: "A equipe da Tipe conversa com você",
    d: "Entendemos o restaurante e explicamos as condições do programa, por escrito.",
  },
  {
    icone: Store,
    t: "Você adota a Tipe no salão",
    d: "Com implantação acompanhada. A adesão ao programa só vale com o aceite dos termos.",
  },
];

function RestauranteFundador() {
  return (
    <SitePage>
      <section data-tema="claro" className="relative -mt-16 overflow-x-clip pt-16">
        <div className="container-page grid items-center gap-10 pb-16 pt-6 sm:pt-10 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pb-24">
          <div>
            <p className="font-display text-[clamp(1.1rem,0.95rem+0.6vw,1.45rem)] tracking-[-0.02em] text-brand-strong">
              Restaurante Fundador
            </p>
            <Palavras
              as="h1"
              imediato
              delay={150}
              className="mt-4 block font-display text-[clamp(2.3rem,1.2rem+4vw,4.8rem)] font-normal leading-[1] tracking-[-0.05em] text-balance"
            >
              Faça parte dos primeiros restaurantes a construir o futuro da Tipe.
            </Palavras>
            <p
              className="hero-in mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground text-pretty sm:text-xl"
              style={{ "--d": "450ms" } as CSSProperties}
            >
              Um programa para restaurantes que adotam a Tipe agora, no pagamento da mesa, e querem
              participar de perto do que vem depois.
            </p>
            <div
              className="hero-in mt-8 flex flex-wrap gap-3"
              style={{ "--d": "600ms" } as CSSProperties}
            >
              <BotaoPrincipal href="#cadastro" vivo>
                Quero participar
              </BotaoPrincipal>
              <BotaoSecundario href="/produtos/pay">Ver o Tipe Pay</BotaoSecundario>
            </div>
          </div>
          <div className="relative">
            <Foto
              nome="cena-dono"
              prioridade
              alt="Dono de restaurante no salão, com o suporte da Tipe com QR Code nas mesas"
              posicao="50% 35%"
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="aspect-[4/5] rounded-[2rem] sm:aspect-square lg:aspect-[4/5]"
            />
            <div
              className="pop-in absolute -bottom-8 right-3 w-[36%] max-w-[12.5rem] sm:right-6"
              style={{ "--d": "700ms" } as CSSProperties}
            >
              <CelularReal
                tela="conta"
                alt="Tela real da conta da Mesa 12 no celular do cliente, com o total e o botão de pagar"
                sizes="220px"
                prioridade
              />
            </div>
          </div>
        </div>
      </section>

      <Secao tema="escuro">
        <div className="container-page">
          <Titulo
            rotulo="Começa pelo que já funciona"
            titulo="O programa é sobre a Tipe de hoje."
            texto="Ser Restaurante Fundador é usar a Tipe no salão desde já. Não depende do Tipe Guest, que ainda está em breve."
          />
          <ul className="mt-12 grid gap-5 sm:grid-cols-3">
            {HOJE.map((h, i) => (
              <Reveal
                as="li"
                key={h.t}
                delay={i * 110}
                className="rounded-[1.75rem] bg-white/[0.06] p-7 ring-1 ring-white/10"
              >
                <h.icone className="h-7 w-7 text-[#0FC9BD]" aria-hidden />
                <p className="mt-5 font-display text-[1.4rem] tracking-[-0.02em]">{h.t}</p>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-muted-foreground">{h.d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Secao>

      <Secao tema="claro">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <Titulo rotulo="Como participar" titulo="Três passos, sem pressa." />
            <ol className="mt-10 space-y-6">
              {PASSOS.map((p, i) => (
                <Reveal as="li" key={p.t} delay={i * 100} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0FC9BD] font-display text-lg text-[#021E34]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-[1.3rem] tracking-[-0.02em]">{p.t}</p>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-muted-foreground">
                      {p.d}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <div className="self-start rounded-[1.75rem] border-2 border-dashed border-foreground/20 p-7 sm:p-9">
            <p className="inline-flex rounded-full bg-[#021E34] px-3 py-1 text-[0.78rem] font-medium text-white">
              Em definição
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] font-normal leading-[1.08] tracking-[-0.035em]">
              Regras e condições do programa
            </h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-muted-foreground">
              As regras do Restaurante Fundador ainda estão sendo definidas. Elas serão apresentadas
              por escrito, antes de qualquer adesão. Nada nesta página é oferta de preço, desconto
              ou vantagem.
            </p>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-muted-foreground">
              Cadastrar o interesse não cria compromisso para você nem para a Tipe.
            </p>
          </div>
        </div>
      </Secao>

      <section data-tema="claro" id="cadastro" className="scroll-mt-16 px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="relative mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.25rem] bg-[linear-gradient(120deg,#021E34_0%,#03465a_55%,#0b9e94_100%)] px-6 py-12 text-white sm:px-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <div>
            <Palavras
              as="h2"
              className="block max-w-[14ch] font-display text-[clamp(2.2rem,1.3rem+3.4vw,4.2rem)] font-normal leading-[0.98] tracking-[-0.045em]"
            >
              Quero ser Restaurante Fundador.
            </Palavras>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
              Deixe o contato do restaurante. A equipe da Tipe fala com você para explicar o
              programa.
            </p>
            <a
              href="/produtos/guest"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-white/85 underline underline-offset-4"
            >
              O que é o Tipe Guest (em breve) <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <FormularioInteresse origem="restaurante-fundador" />
        </div>
      </section>
    </SitePage>
  );
}
