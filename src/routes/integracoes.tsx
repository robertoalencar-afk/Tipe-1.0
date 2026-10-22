import { createFileRoute } from "@tanstack/react-router";
import { FaixaDuplaIntegracoes, HubIntegracoes, ListaIntegracoes } from "@/components/tipe/site/GradeIntegracoes";
import { BotaoPrincipal, BotaoSecundario, FaixaCta, Secao, SitePage, Titulo } from "@/components/tipe/site/Site";

const TITLE = "Integrações · Pix, Apple Pay, Google Pay e o seu PDV | Tipe";
const DESC =
  "O que a Tipe já conecta hoje (Pix, Apple Pay, Google Pay, Pagar.me, Lançamento TIPE e API TIPE), o que está em desenvolvimento e o que está planejado.";

export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://tipe.digital/integracoes" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/integracoes" }],
  }),
  component: Integracoes,
});

function Integracoes() {
  return (
    <SitePage>
      <Secao tema="claro" className="-mt-16 !pt-32 sm:!pt-40">
        <div className="container-page grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <Titulo
            as="h1"
            rotulo="Integrações"
            titulo="A Tipe entra no jeito que você já trabalha."
            texto="Pix, Apple Pay e Google Pay pelo Pagar.me. Pedidos pelo Lançamento TIPE ou pela API TIPE. O que ainda está a caminho aparece separado."
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <BotaoPrincipal>Teste grátis</BotaoPrincipal>
            <BotaoSecundario href="#status">Ver o status de cada uma</BotaoSecundario>
          </div>
        </div>
        <div className="container-page mt-12 sm:mt-14">
          <HubIntegracoes />
        </div>
      </Secao>
      <Secao tema="escuro">
        <div className="container-page">
          <Titulo
            rotulo="Hoje e a caminho"
            titulo="O que já conecta, e o que vem aí."
            texto="Em cima, o que funciona hoje. Embaixo, o que está em desenvolvimento ou planejado, sem promessa de data."
          />
        </div>
        <div className="mt-12 sm:mt-16">
          <FaixaDuplaIntegracoes />
        </div>
      </Secao>
      <Secao tema="claro" id="status">
        <div className="container-page">
          <Titulo rotulo="Em detalhe" titulo="O que cada integração faz." className="mb-12" />
          <ListaIntegracoes />
        </div>
      </Secao>
      <FaixaCta titulo="Conte qual é o seu PDV." texto="A gente mostra o caminho mais curto para ligar a Tipe ao seu salão." />
    </SitePage>
  );
}
