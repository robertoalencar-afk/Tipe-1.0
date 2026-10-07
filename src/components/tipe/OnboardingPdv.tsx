import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, MessageCircle, ShoppingCart, UtensilsCrossed, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finishOnboarding } from "@/lib/tipe/subscription.functions";
import { whatsappLink } from "@/lib/tipe/contact";

// Primeiro acesso: todo restaurante começa no Lançamento TIPE.
// A integração direta com o sistema do restaurante é feita pela equipe TIPE.
export function OnboardingPdv({ slug, nome, onDone }: { slug: string; nome: string; onDone: () => void }) {
  const finish = useServerFn(finishOnboarding);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function concluir() {
    setBusy(true);
    try {
      await finish({ data: { slug } });
      qc.invalidateQueries({ queryKey: ["ops", slug] });
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const passos = [
    { icon: UtensilsCrossed, t: "Cadastre o cardápio", d: "Categorias, itens e preços. Dá para importar uma planilha CSV." },
    { icon: ShoppingCart, t: "Lance os pedidos", d: "Escolha a mesa, toque nos itens e confirme. Em até 3 toques." },
    { icon: QrCode, t: "O cliente paga pelo QR", d: "Os itens aparecem na hora na conta da mesa, no celular do cliente." },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Bem-vindo à TIPE{nome ? `, ${nome}` : ""}!</p>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Você já pode começar com o Lançamento TIPE</h1>
        <p className="mt-1 text-muted-foreground">A TIPE não substitui o seu sistema. Ela cuida só do fechamento da conta. Enquanto a integração direta com o seu sistema não fica pronta, ou se você não usa um, os pedidos entram pelo Lançamento TIPE em segundos.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {passos.map((p, i) => (
          <div key={p.t} className="rounded-2xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><p.icon className="h-5 w-5" /></span>
            <p className="mt-3 font-display font-bold">{i + 1}. {p.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
          </div>
        ))}
      </div>
      <Button className="w-full" size="lg" disabled={busy} onClick={concluir}><Check className="mr-1 h-4 w-4" />Começar com o Lançamento TIPE</Button>
      <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Quer ligar o sistema que você já usa? A integração direta é feita pela equipe TIPE, junto com você.
        <a href={whatsappLink("Olá! Quero integrar o sistema do meu restaurante com a TIPE.")} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 font-semibold text-primary"><MessageCircle className="h-4 w-4" />Fale com a gente</a>
      </div>
    </div>
  );
}
