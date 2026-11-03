/**
 * Números de mercado com fonte. Só entram dados independentes e verificáveis
 * (Banco Central, Abecs, Abrasel); nenhum é apresentado como resultado da Tipe.
 * Levantamento e critérios: /mnt/project-files/landing-v3/v4/estatisticas.md.
 */
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/tipe/landing/motion";
import { Secao, Titulo } from "./Site";

export const NUMEROS = [
  {
    v: "148 mi",
    t: "de brasileiros usaram Pix em 2025, cerca de 86% dos adultos.",
    fonte: "Banco Central do Brasil, Relatório de Gestão do Pix 2023–2025",
    url: "https://www.bcb.gov.br/content/estabilidadefinanceira/pix/relatorio_de_gestao_pix/relatorio_gestao_pix_2026.pdf",
  },
  {
    v: "24,2%",
    t: "das vendas presenciais de bares e restaurantes do Nordeste já são pagas com Pix.",
    fonte: "Pesquisa Abrasel, publicada pela Agência Brasil em 06/08/2026",
    url: "https://agenciabrasil.ebc.com.br/economia/noticia/2026-08/pix-amplia-participacao-nos-pagamentos-em-bares-e-restaurantes",
  },
  {
    v: "73,6%",
    t: "das compras presenciais com cartão já são feitas por aproximação.",
    fonte: "Abecs, Balanço do setor de meios eletrônicos de pagamento, resultados de 2025",
    url: "https://abecs.org.br/storage/sector_balances/24/01KH6F7ASSZ4ST9T6R0515EC2E.pdf",
  },
] as const;

export function NumerosHome() {
  return (
    <Secao tema="claro" id="numeros">
      <div className="container-page">
        <Titulo
          rotulo="O contexto"
          titulo="O cliente já paga pelo celular. A conta ainda não."
          texto="Dados públicos de mercado. Não são resultados da Tipe, que está em pré-lançamento."
        />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] bg-border sm:mt-16 md:grid-cols-3">
          {NUMEROS.map((n, i) => (
            <Reveal
              as="li"
              key={n.v}
              delay={i * 120}
              className="flex flex-col bg-background p-6 sm:p-8"
            >
              <p className="font-display text-[clamp(3rem,2.2rem+3vw,5.2rem)] font-normal leading-none tracking-[-0.06em]">
                {n.v}
              </p>
              <p className="mt-4 max-w-xs text-[1.05rem] leading-snug">{n.t}</p>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-start gap-1 pt-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Fonte: {n.fonte}
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </Secao>
  );
}
