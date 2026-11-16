import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { htmlPreConta, imprimirHtml, type LinhaConta } from "@/lib/tipe/imprimir";

/** Imprime a pré-conta da mesa (conferência, sem valor fiscal). A taxa de serviço vem do restaurante. */
export function BotaoPreConta({ restaurante, mesa, garcom, linhas, taxa }: { restaurante: string; mesa: string; garcom?: string | null; linhas: LinhaConta[]; taxa: number }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      disabled={linhas.length === 0}
      onClick={() => imprimirHtml(htmlPreConta({ restaurante, mesa, garcom: garcom ?? null, hora: new Date(), linhas, taxa }), `Pré-conta mesa ${mesa}`)}
    >
      <Printer className="mr-2 h-4 w-4" />Imprimir pré-conta
    </Button>
  );
}
