/** Área expansível "Como calculamos esses resultados?": fontes, hipóteses, fórmulas e limites. */
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { CENARIOS, FONTES, INDICADORES_SUNDAY as S } from "@/lib/tipe/giro/cenarios";
import { SHOW_PLAN_PRICES } from "@/lib/tipe/plans";

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[0.95rem] font-medium text-[#021E34]">{titulo}</h3>
      <div className="mt-2 space-y-2 text-[0.875rem] leading-relaxed text-[#021E34]/70">{children}</div>
    </div>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[0.7rem] bg-[#021E34]/[0.04] px-3 py-2 font-mono text-[0.78rem] leading-relaxed text-[#021E34]/80">
      {children}
    </p>
  );
}

export function ComoCalculamos() {
  return (
    <details className="group rounded-[1.4rem] border border-[#021E34]/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[1.4rem] px-5 py-4 text-[1rem] font-medium text-[#021E34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD] sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        Como calculamos esses resultados?
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-8 border-t border-[#021E34]/8 px-5 pb-6 pt-5 sm:px-6 md:grid-cols-2 md:gap-x-10">
        <Bloco titulo="Benchmark não é projeção">
          <p>
            Os números da Sunday são indicadores que outra empresa divulga sobre a rede dela. Usamos alguns como ponto de partida
            dos cenários e mostramos outros só para comparar. Nenhum é resultado da Tipe nem promessa.
          </p>
          <p>
            A projeção é a conta feita com os dados do seu restaurante. Se você mudar um campo, ela muda. O benchmark não.
          </p>
        </Bloco>

        <Bloco titulo="De onde vem cada cenário">
          <ul className="space-y-1.5">
            {Object.values(CENARIOS).map((c) => (
              <li key={c.nome}>
                <strong className="font-medium text-[#021E34]">{c.nome}:</strong> {c.origem}
              </li>
            ))}
          </ul>
          <p>
            A adoção do QR Code é uma hipótese porque depende do seu público e de como a equipe apresenta o QR. Os valores iniciais
            do restaurante também são hipóteses demonstrativas, não médias do mercado.
          </p>
        </Bloco>

        <Bloco titulo="Tempo e capacidade">
          <Formula>ciclo atual = permanência + espera pelo pagamento + liberação</Formula>
          <Formula>economia efetiva = menor valor entre a economia do cenário e a espera informada</Formula>
          <Formula>ciclo com Tipe = ciclo atual − economia efetiva × adoção</Formula>
          <Formula>capacidade por serviço ≈ mesas × horário efetivo ÷ ciclo</Formula>
          <Formula>tempo recuperado = contas pagas pelo QR × economia efetiva</Formula>
          <p>
            A capacidade é uma aproximação: supõe que as mesas giram de forma contínua durante o horário efetivo. Mesas juntadas,
            reservas e picos curtos mudam o número real.
          </p>
        </Bloco>

        <Bloco titulo="Por que a demanda manda na receita">
          <p>Minuto economizado só vira venda se houver cliente esperando mesa. Por isso as contas extras são o menor destes três:</p>
          <Formula>contas extras = menor(capacidade adicional, procura não atendida − folga atual, limite da operação)</Formula>
          <p>
            Se hoje já sobram mesas no serviço, essa folga atende parte da procura sem a Tipe e não entra na conta. Sem procura não
            atendida informada, a receita nova por giro é zero.
          </p>
          <Formula>receita por giro = contas extras × tíquete médio</Formula>
        </Bloco>

        <Bloco titulo="Retorno sobre a assinatura">
          <Formula>margem incremental = receita incremental × margem de contribuição</Formula>
          <Formula>resultado líquido = margem incremental − assinatura da Tipe − custos extras</Formula>
          <Formula>retorno = resultado líquido ÷ (assinatura + custos extras)</Formula>
          <p>
            Faturamento não é lucro. Sem a margem e o valor da assinatura, não mostramos resultado líquido.{" "}
            {SHOW_PLAN_PRICES
              ? "O valor inicial da assinatura vem da tabela de planos da Tipe e pode ser editado."
              : "O valor da assinatura é você quem informa."}
          </p>
        </Bloco>

        <Bloco titulo="Gorjetas, tíquete e o que fica de fora">
          <p>
            A Sunday divulga gorjetas {S.gorjetasPct}% maiores. Lemos isso como aumento relativo: uma gorjeta de 10% da conta
            passaria a 11%, não a 20%. Gorjeta é da equipe e nunca entra no faturamento do restaurante. Na gorjeta extra da Tipe,
            70% vão para o garçom da mesa e 30% ficam com a Tipe.
          </p>
          <p>
            Os +{S.ticketPct}% de tíquete médio e os +{S.faturamentoPct}% de faturamento da Sunday não são aplicados. O aumento de
            tíquete começa em 0% e fica numa linha separada, se você quiser testar. Tempo recuperado não vira economia de folha.
          </p>
        </Bloco>

        <Bloco titulo="Adoção por contas e por valor">
          <p>
            A adoção que você ajusta é a parte das contas pagas pelo QR. O valor que passaria pelo QR aparece separado e supõe o
            mesmo tíquete médio nessas contas. Se as mesas maiores usarem mais o QR, a parte do valor será maior que a das contas.
          </p>
        </Bloco>

        <Bloco titulo="Por que o resultado real varia">
          <p>
            Perfil do público, uso do QR, tamanho do salão, ritmo da cozinha, reservas, sazonalidade e a forma como a equipe
            apresenta o pagamento mudam o resultado. Trate os números como ordem de grandeza para conversar, não como previsão.
          </p>
          <p className="flex flex-col gap-1">
            <a href={FONTES.home.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-[#021E34] underline-offset-4 hover:underline">
              {FONTES.home.nome} <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
            <a href={FONTES.roi.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-[#021E34] underline-offset-4 hover:underline">
              {FONTES.roi.nome} <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          </p>
        </Bloco>
      </div>
    </details>
  );
}
