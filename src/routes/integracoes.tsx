import { createFileRoute } from "@tanstack/react-router";
import { Foto } from "@/components/tipe/site/Foto";
import { GradeIntegracoes } from "@/components/tipe/site/GradeIntegracoes";
import { INTEGRACOES } from "@/components/tipe/site/produtos";
import { BotaoPrincipal, FaixaCta, Secao, SitePage, Titulo } from "@/components/tipe/site/Site";

const TITLE = "Integrações · Pix, Apple Pay, Google Pay e o seu PDV | Tipe";
const DESC =
  "O que a Tipe já conecta hoje (Pix, Apple Pay, Google Pay, Pagar.me, Lançamento TIPE e API TIPE) e os conectores de PDV que estão a caminho.";

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
        <div className="container-page grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Titulo
            as="h1"
            rotulo="Integrações"
            titulo="A Tipe entra no jeito que você já trabalha."
            texto="Use a Tipe completa, com o Lançamento TIPE no lugar de outro sistema, ou só o fechamento da conta junto do PDV que você já tem."
          />
          <div>
            <BotaoPrincipal>Falar sobre o meu PDV</BotaoPrincipal>
          </div>
        </div>
        <div className="container-page mt-14">
          <Foto
            nome="integracoes"
            prioridade
            alt="Caixa de um restaurante com computador, impressora e tablet"
            sizes="100vw"
            className="aspect-[16/10] rounded-[2rem] sm:aspect-[21/9]"
          />
        </div>
      </Secao>
      <Secao tema="escuro">
        <div className="container-page">
          <Titulo
            rotulo="Hoje e a caminho"
            titulo="O que já conecta, e o que vem aí."
            texto="Mostramos com clareza o que funciona hoje. Os conectores para outros PDVs estão em desenvolvimento, com integração assistida pela nossa equipe."
          />
          <div className="mt-12">
            <GradeIntegracoes />
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INTEGRACOES.map((it) => (
              <li key={it.nome} className="border-t border-border pt-4">
                <p className="font-medium">{it.nome}</p>
                <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </Secao>
      <FaixaCta titulo="Conte qual é o seu PDV." texto="A gente mostra o caminho mais curto para ligar a Tipe ao seu salão." />
    </SitePage>
  );
}
