import { createFileRoute } from "@tanstack/react-router";
import { FaixaDuplaIntegracoes, HubIntegracoes, ListaIntegracoes } from "@/components/tipe/site/GradeIntegracoes";
import { CatalogoIntegracoes } from "@/components/tipe/site/integracoes/CatalogoIntegracoes";
import { BotaoPrincipal, BotaoSecundario, FaixaCta, Secao, SitePage, Titulo } from "@/components/tipe/site/Site";

const TITLE = "Integrações · Pix, Apple Pay, Google Pay e o seu PDV | Tipe";
const DESC =
  "Conecte a Tipe ao seu PDV, delivery, ERP, emissor de nota e maquininhas: Saipos, iFood, Omie, Bling, TOTVS e mais, com passo a passo para cada sistema.";

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
            texto="PDV, delivery, ERP, nota fiscal e maquininhas. Escolha o seu sistema, envie a chave ou o arquivo, e a Tipe liga."
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <BotaoPrincipal>Teste grátis</BotaoPrincipal>
            <BotaoSecundario href="#conectar">Escolher o meu sistema</BotaoSecundario>
          </div>
        </div>
        <div className="container-page mt-12 sm:mt-14">
          <HubIntegracoes />
        </div>
      </Secao>
      <Secao tema="escuro">
        <div className="container-page">
          <Titulo
            rotulo="Conecta com"
            titulo="O que você já usa, ligado à Tipe."
            texto="Em cima, o que a Tipe faz. Embaixo, os sistemas que ela conecta."
          />
        </div>
        <div className="mt-12 sm:mt-16">
          <FaixaDuplaIntegracoes />
        </div>
      </Secao>
      <Secao tema="claro" id="conectar">
        <div className="container-page">
          <Titulo
            rotulo="Passo a passo"
            titulo="Escolha o seu sistema."
            texto="Cada sistema tem o seu caminho: chave de API, autorização da conta, arquivo ou certificado. Toque e veja o passo a passo."
            className="mb-10"
          />
          <CatalogoIntegracoes />
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
