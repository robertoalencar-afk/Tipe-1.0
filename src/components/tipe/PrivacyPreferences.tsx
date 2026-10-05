import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { readConsent, saveConsent, type ConsentCategory } from "@/lib/tipe/consent";

const CATS: { id: ConsentCategory | "necessary"; name: string; desc: string; inUse: boolean }[] = [
  { id: "necessary", name: "Necessários", desc: "Login da área do restaurante, identificação local na mesa, conclusão do cadastro e suas preferências de privacidade. Sem eles o serviço não funciona.", inUse: true },
  { id: "functional", name: "Funcionais", desc: "Recursos opcionais de conveniência. Não utilizados atualmente.", inUse: false },
  { id: "analytics", name: "Analytics", desc: "Medição de audiência. O TIPE não usa ferramentas de analytics hoje.", inUse: false },
  { id: "marketing", name: "Marketing", desc: "Publicidade e pixels. O TIPE não usa tecnologias de marketing hoje.", inUse: false },
];

export function PrivacyPreferences({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState({ functional: false, analytics: false, marketing: false });
  useEffect(() => { if (open) { const s = readConsent(); if (s) setC({ functional: s.functional, analytics: s.analytics, marketing: s.marketing }); } }, [open]);
  const salvar = (v: typeof c) => { saveConsent(v); setC(v); setOpen(false); toast.success("Preferências de privacidade salvas."); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button" className={triggerClassName}>Preferências de privacidade</button></DialogTrigger>
      <DialogContent className="max-h-[85svh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferências de privacidade</DialogTitle>
          <DialogDescription>Hoje o TIPE usa apenas tecnologias necessárias. Você pode registrar sua escolha para categorias opcionais caso venham a existir.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {CATS.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-4 rounded-xl border p-3">
              <div>
                <p className="text-sm font-semibold">{k.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{k.desc}</p>
              </div>
              {k.id === "necessary"
                ? <span className="shrink-0 text-xs font-semibold text-primary">Sempre ativos</span>
                : <Switch aria-label={k.name} checked={c[k.id]} onCheckedChange={(v) => setC({ ...c, [k.id]: v })} />}
            </li>
          ))}
        </ul>
        <DialogFooter className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => salvar({ functional: false, analytics: false, marketing: false })}>Rejeitar não essenciais</Button>
          <Button variant="outline" onClick={() => salvar(c)}>Salvar preferências</Button>
          <Button variant="outline" onClick={() => salvar({ functional: true, analytics: true, marketing: true })}>Aceitar todos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
