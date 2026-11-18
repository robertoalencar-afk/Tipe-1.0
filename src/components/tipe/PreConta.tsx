import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";
import { htmlPreConta, imprimirHtml, type LinhaConta, type Papel } from "@/lib/tipe/imprimir";
import { lerConfiguracaoImpressaoFiscal } from "@/lib/tipe/fiscal/printing";

const PAPEIS: { v: Papel; label: string }[] = [
  { v: "80", label: "80 mm" },
  { v: "58", label: "58 mm" },
  { v: "a4", label: "A4" },
];
const ehPapel = (v: unknown): v is Papel => v === "58" || v === "80" || v === "a4";

/** Papel da pré-conta neste aparelho: o último escolhido, senão o da impressora configurada no Fiscal, senão 80 mm. */
function usePapel(slug?: string) {
  const chave = `tipe:preconta-papel:v1:${slug ?? "geral"}`;
  const [papel, setPapel] = useState<Papel>("80");
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chave);
      if (ehPapel(salvo)) return setPapel(salvo);
      if (slug)
        setPapel(
          lerConfiguracaoImpressaoFiscal(localStorage.getItem(`tipe:fiscal-printer:v1:${slug}`))
            .paper,
        );
    } catch {
      /* sem armazenamento local: fica 80 mm */
    }
  }, [chave, slug]);
  const escolher = (p: Papel) => {
    setPapel(p);
    try {
      localStorage.setItem(chave, p);
    } catch {
      /* sem armazenamento local: vale só agora */
    }
  };
  return [papel, escolher] as const;
}

/** Imprime a pré-conta da mesa (conferência, sem valor fiscal). A taxa de serviço vem do restaurante. */
export function BotaoPreConta({
  slug,
  restaurante,
  razaoSocial,
  cnpj,
  endereco,
  telefone,
  mesa,
  garcom,
  linhas,
  taxa,
  pagoItens,
  link,
}: {
  slug?: string;
  restaurante: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  mesa: string;
  garcom?: string | null;
  linhas: LinhaConta[];
  taxa: number;
  /** Subtotal dos itens já pagos (sem serviço), para mostrar o que falta. */
  pagoItens?: number;
  link?: string | null;
}) {
  const [papel, setPapel] = usePapel(slug);
  function imprimir() {
    const qrSvg = link ? renderToStaticMarkup(<QRCodeSVG value={link} size={160} />) : null;
    imprimirHtml(
      htmlPreConta({
        restaurante,
        razaoSocial: razaoSocial ?? null,
        cnpj: cnpj ?? null,
        endereco: endereco ?? null,
        telefone: telefone ?? null,
        mesa,
        garcom: garcom ?? null,
        hora: new Date(),
        linhas,
        taxa,
        pagoItens: pagoItens ?? 0,
        qrSvg,
      }),
      `Pré-conta mesa ${mesa}`,
      papel,
    );
  }
  return (
    <div className="flex items-stretch gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1"
        disabled={linhas.length === 0}
        onClick={imprimir}
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir pré-conta
      </Button>
      <label className="sr-only" htmlFor={`papel-preconta-${mesa}`}>
        Papel da pré-conta
      </label>
      <select
        id={`papel-preconta-${mesa}`}
        value={papel}
        onChange={(e) => ehPapel(e.target.value) && setPapel(e.target.value)}
        title="Papel da impressão"
        className="h-11 rounded-md border border-input bg-background px-2 text-sm"
      >
        {PAPEIS.map((p) => (
          <option key={p.v} value={p.v}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
