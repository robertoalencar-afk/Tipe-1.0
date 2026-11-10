/**
 * Duas faixas em movimento, em sentidos opostos: em cima o que a Tipe faz,
 * embaixo os sistemas que ela conecta, com a marca de cada um. Usa a classe global `.marquee` (para no hover e com movimento reduzido).
 */
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ChefHat,
  Code2,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ListChecks,
  Plug,
  QrCode,
  Receipt,
  RefreshCw,
  Smartphone,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ehParcial, INTEGRACOES_V5, STATUS_ROTULO, type Integracao } from "./dados";
import { SISTEMAS } from "./catalogo";
import { MarcaSistema } from "./CatalogoIntegracoes";

export const ICONE_INTEGRACAO: Record<string, LucideIcon> = {
  Pix: QrCode,
  "Apple Pay": Smartphone,
  "Google Pay": Wallet,
  "Pagar no estabelecimento": Banknote,
  "Provedor de pagamento": CreditCard,
  "Lançamento TIPE": ListChecks,
  "API TIPE": Code2,
  "Conectores de PDV": Plug,
  "Baixa automática no PDV": RefreshCw,
  "Lightspeed K-Series": Store,
  "Cozinha e bar": ChefHat,
  "Fechamento do dia em CSV": FileSpreadsheet,
  "Cardápio por planilha": FileSpreadsheet,
  "Fiscal e NFC-e": Receipt,
  Delivery: Truck,
  "ERP e contabilidade": Landmark,
};

const FUNDOS = ["#0FC9BD", "#f3efe7", "#ffd27a", "#9be7c4", "#8fd3ff", "#ffffff"];

function Faixa({ itens, sentido, aCaminho = false }: { itens: Integracao[]; sentido: 1 | -1; aCaminho?: boolean }) {
  const repeticoes = Math.max(2, Math.ceil(16 / itens.length)) * 2;
  const lista = Array.from({ length: repeticoes }, () => itens).flat();
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
      <ul
        className={cn("marquee flex w-max gap-3 py-1.5", sentido < 0 && "[animation-direction:reverse]")}
        style={{ animationDuration: `${lista.length * 3.2}s` }}
      >
        {lista.map((it, i) => {
          const Icone = ICONE_INTEGRACAO[it.nome] ?? Plug;
          const copia = i >= itens.length;
          return (
            <li
              key={i}
              aria-hidden={copia || undefined}
              className={cn(
                "flex h-[6.5rem] w-[14.5rem] shrink-0 flex-col justify-between rounded-[1.4rem] p-4 sm:h-[7.25rem] sm:w-[16.5rem] sm:p-5",
                aCaminho
                  ? cn(
                      "border border-dashed text-white",
                      ehParcial(it.status) ? "border-[#0FC9BD]/55 bg-[#0FC9BD]/[0.06]" : "border-white/20 text-white/70",
                    )
                  : "text-[#021E34]",
              )}
              style={aCaminho ? undefined : { background: FUNDOS[i % FUNDOS.length] }}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full",
                    aCaminho ? "bg-white/[0.08]" : "bg-[#021E34]/[0.08]",
                  )}
                >
                  <Icone className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.68rem] font-medium",
                    aCaminho
                      ? ehParcial(it.status)
                        ? "text-[#7fe9e1]"
                        : "text-white/55"
                      : "bg-[#021E34]/[0.08]",
                  )}
                >
                  {STATUS_ROTULO[it.status]}
                </span>
              </span>
              <span className="font-display text-[1.3rem] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[1.5rem]">
                {it.nome}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Faixa de baixo (03/11): os sistemas que a Tipe conecta, com a marca de cada um. */
function FaixaSistemas() {
  const lista = [...SISTEMAS.filter((x) => x.id !== "outro-pdv"), ...SISTEMAS.filter((x) => x.id !== "outro-pdv")];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
      <ul className="marquee flex w-max gap-3 py-1.5 [animation-direction:reverse]" style={{ animationDuration: `${lista.length * 2.4}s` }}>
        {lista.map((sis, i) => (
          <li
            key={i}
            aria-hidden={i >= lista.length / 2 || undefined}
            className="flex h-[4.5rem] shrink-0 items-center gap-3 rounded-[1.2rem] border border-white/12 bg-white/[0.04] pl-3 pr-5 text-white"
          >
            <MarcaSistema sis={sis} />
            <span className="whitespace-nowrap font-display text-[1.05rem] font-medium tracking-[-0.03em]">{sis.nome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FaixaDuplaIntegracoes() {
  return (
    <div className="space-y-3">
      <Faixa itens={INTEGRACOES_V5} sentido={1} />
      <FaixaSistemas />
    </div>
  );
}
