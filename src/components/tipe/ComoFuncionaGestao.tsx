import { ArrowRight, ChefHat, ImageIcon, QrCode, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const PASSOS = [
  { k: "cardapio", i: ImageIcon, t: "Monte o cardápio", d: "Cadastre pratos, preços e categorias. Use o Banco de imagens para dar uma foto a cada prato.", b: "Abrir cardápio" },
  { k: "qr", i: QrCode, t: "Imprima os QR Codes das mesas", d: "Cada mesa tem um QR Code. O cliente aponta o celular e acompanha a conta sem baixar nada.", b: "Ver mesas e QR" },
  { k: "equipe", i: UsersRound, t: "Convide a equipe", d: "Dê a cada pessoa a função certa: gerente, caixa ou garçom. Cada função só vê o que precisa.", b: "Abrir equipe" },
  { k: "pdv", i: ChefHat, t: "Lance pedidos e acompanhe a cozinha", d: "O garçom lança na mesa, a cozinha recebe por setor e o cliente vê os itens na hora no celular.", b: "Lançar pedido" },
  { k: "caixa", i: Wallet, t: "Receba e feche o caixa", d: "O cliente divide por itens e paga. Você confirma o que for no balcão e fecha o dia com os números conferidos.", b: "Abrir caixa" },
] as const;

/** Passo a passo do Tipe Gestão, com atalho para cada tela. */
export function ComoFuncionaGestao({ ir }: { ir: (k: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">Do cardápio ao fechamento do caixa, em cinco passos. Toque em cada um para ir direto à tela.</p>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PASSOS.map((p, n) => (
          <li key={p.k} className="surface-card flex min-w-0 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong"><p.i className="size-5" aria-hidden /></span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passo {n + 1}</span>
            </div>
            <h3 className="font-display text-lg font-semibold leading-snug">{p.t}</h3>
            <p className="flex-1 text-sm text-muted-foreground">{p.d}</p>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => ir(p.k)}>{p.b}<ArrowRight className="ml-1.5 size-4" /></Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
