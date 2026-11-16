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
  "Veja o que a Tipe integra hoje (Lançamento TIPE, API TIPE, NFC-e pelo Focus NFe, pagamentos digitais sujeitos à validação) e as condições de compatibilidade para PDVs, delivery e ERP.";

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
            titulo="Integrações com status claro."
            texto="Hoje você opera pelo Lançamento TIPE ou envia mesas e itens pela API TIPE. Pagamentos digitais estão sujeitos à validação por restaurante. A compatibilidade com outros sistemas é avaliada pela equipe. Mostramos o que está pronto e o que ainda não."
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
            titulo="O que existe hoje e o que está a caminho."
            texto="Em cima, o que a Tipe faz. Embaixo, os sistemas que queremos conectar. Nenhum deles está homologado ainda."
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
            texto="Cada sistema tem o seu caminho previsto: chave de API, autorização da conta, arquivo ou certificado. A ativação é assistida pela nossa equipe e combinada caso a caso."
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
