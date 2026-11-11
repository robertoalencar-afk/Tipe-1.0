import { ArrowRight, Check } from "lucide-react";
import { Secao, Titulo } from "../Site";
import { Foto } from "../Foto";
import { CelularReal, TabletSalao } from "../produto/TelaReal";

const RECURSOS = [
  {
    t: "Quantidade e observações",
    d: "O cliente revisa os itens e escreve como quer o pedido antes de enviar.",
  },
  {
    t: "Preparo acompanhado",
    d: "A cozinha recebe os itens e a equipe acompanha o que está em preparo e pronto para entregar.",
  },
  {
    t: "Consumo na conta",
    d: "Na mesa, o que foi pedido entra na conta. O Tipe Pay cuida da divisão e do pagamento.",
  },
  {
    t: "Um cadastro de produtos",
    d: "O cardápio da casa alimenta os formatos habilitados, com preços e disponibilidade no Tipe Gestão.",
  },
];

/** Texto sempre no DOM; provas visuais vêm exclusivamente do app e do casting oficial. */
export function FuncionalidadesOrder() {
  return (
    <Secao
      tema="escuro"
      id="funcionalidades"
      className="bg-[#021E34] text-white [--muted-foreground:#c4d2dc]"
    >
      <div className="container-page">
        <Titulo
          titulo="Cada escolha vira um pedido bem cuidado."
          texto="Os formatos mudam. O cuidado com o pedido continua: do cardápio no celular ao preparo, da entrega à conta."
        />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="relative isolate flex min-h-[25rem] items-center justify-center overflow-hidden rounded-[2rem] bg-[#0FC9BD] px-7 py-10 sm:min-h-[32rem]">
            <CelularReal
              tela="order-inicio"
              alt="Cardápio real do Order com categorias e produtos de exemplo"
              sizes="(min-width: 1024px) 230px, 38vw"
              className="w-[42%] max-w-[14rem] -rotate-6"
            />
            <CelularReal
              tela="pedido"
              alt="Tela real de revisão do pedido com itens, quantidade e observação"
              sizes="(min-width: 1024px) 230px, 38vw"
              className="-ml-3 mt-14 w-[42%] max-w-[14rem] rotate-6"
            />
          </div>
          <div>
            <h3 className="max-w-[15ch] font-display text-[clamp(2rem,3.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em]">
              A escolha é do cliente. O detalhe chega junto.
            </h3>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
              Cardápio visual, quantidade e observação no mesmo caminho. O cliente confere o que
              escolheu e envia quando estiver pronto.
            </p>
            <a
              href="#simulador"
              className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#0FC9BD] px-6 font-medium text-[#021E34] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Montar um pedido <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
        <div className="mt-14 grid gap-10 border-t border-white/20 pt-14 lg:mt-20 lg:grid-cols-2 lg:gap-20">
          <div>
            <h3 className="max-w-[17ch] font-display text-[clamp(2rem,3.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em]">
              Quem prepara e quem atende, na mesma página.
            </h3>
            <dl className="mt-7 divide-y divide-white/20">
              {RECURSOS.map((r) => (
                <div key={r.t} className="py-5">
                  <dt className="flex items-center gap-3 text-lg font-medium">
                    <Check aria-hidden className="size-5 shrink-0 text-[#0FC9BD]" />
                    {r.t}
                  </dt>
                  <dd className="mt-2 pl-8 leading-relaxed text-white/75">{r.d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative min-h-[32rem] overflow-hidden rounded-[2rem] sm:min-h-[38rem]">
            <Foto
              nome="cena-cozinha"
              alt="Equipe do casting oficial da Tipe preparando pratos na cozinha"
              className="absolute inset-0 h-full w-full"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
            <TabletSalao
              alt="Tela real do painel do salão Tipe com a Mesa 12 e o estado da conta, em dados de exemplo"
              sizes="(min-width: 1024px) 260px, 55vw"
              className="absolute bottom-6 right-6 w-[50%] max-w-[16rem]"
            />
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-white/70">
          Telas do produto com dados de exemplo. Converse com a equipe da Tipe sobre a implantação
          dos formatos na sua operação. No totem, a cozinha recebe após o caixa confirmar o
          pagamento.
        </p>
      </div>
    </Secao>
  );
}
