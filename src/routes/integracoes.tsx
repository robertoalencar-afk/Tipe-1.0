import { createFileRoute } from "@tanstack/react-router";
import {
  FaixaDuplaIntegracoes,
  HubIntegracoes,
  ListaIntegracoes,
} from "@/components/tipe/site/GradeIntegracoes";
import { CatalogoIntegracoes } from "@/components/tipe/site/integracoes/CatalogoIntegracoes";
import {
  BotaoPrincipal,
  BotaoSecundario,
  FaixaCta,
  Secao,
  SitePage,
  Titulo,
} from "@/components/tipe/site/Site";

const TITLE = "Integrações da Tipe · Pagamentos, PDV e o que vem a seguir";
const DESC =
  "Integrações da Tipe disponíveis e prontas para conectar: pagamentos digitais, Lançamento e API TIPE, PDVs, NFC-e pelo Focus NFe, delivery e ERP.";

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
            titulo="Integrações prontas para conectar."
            texto="Todas as integrações estão disponíveis e prontas para conectar. Você opera pelo Lançamento TIPE ou liga o seu sistema pela API TIPE, e a equipe ativa cada conexão com os dados do restaurante."
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <BotaoPrincipal>Falar com a equipe</BotaoPrincipal>
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
            titulo="O que a Tipe faz e com quem conversa."
            texto="Em cima, o que a Tipe faz. Embaixo, os sistemas prontos para integração, com ativação assistida pela nossa equipe."
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
            texto="Cada sistema tem o seu caminho: chave de API, autorização da conta, arquivo ou certificado. A ativação é assistida pela nossa equipe."
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
      <FaixaCta
        titulo="Conte qual é o seu PDV."
        texto="A gente mostra o caminho mais curto para ligar a Tipe ao seu salão."
      />
    </SitePage>
  );
}
