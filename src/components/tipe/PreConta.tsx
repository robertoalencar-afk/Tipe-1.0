import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";
import { htmlPreConta, imprimirHtml, type LinhaConta } from "@/lib/tipe/imprimir";

/** Imprime a pré-conta da mesa (conferência, sem valor fiscal). A taxa de serviço vem do restaurante. */
export function BotaoPreConta({ restaurante, mesa, garcom, linhas, taxa, link }: { restaurante: string; mesa: string; garcom?: string | null; linhas: LinhaConta[]; taxa: number; link?: string | null }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      disabled={linhas.length === 0}
      onClick={() => imprimirHtml(htmlPreConta({ restaurante, mesa, garcom: garcom ?? null, hora: new Date(), linhas, taxa, qrSvg: link ? renderToStaticMarkup(<QRCodeSVG value={link} size={160} />) : null }), `Pré-conta mesa ${mesa}`)}
    >
      <Printer className="mr-2 h-4 w-4" />Imprimir pré-conta
    </Button>
  );
}
