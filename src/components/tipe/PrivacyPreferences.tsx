import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
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

type Escolha = { functional: boolean; analytics: boolean; marketing: boolean };
const NENHUM: Escolha = { functional: false, analytics: false, marketing: false };
const TODOS: Escolha = { functional: true, analytics: true, marketing: true };

function PreferencesDialog({ open, setOpen, trigger, onSaved }: { open: boolean; setOpen: (v: boolean) => void; trigger?: React.ReactNode; onSaved?: () => void }) {
  const [c, setC] = useState<Escolha>(NENHUM);
  useEffect(() => { if (open) { const s = readConsent(); if (s) setC({ functional: s.functional, analytics: s.analytics, marketing: s.marketing }); } }, [open]);
  const salvar = (v: Escolha) => { saveConsent(v); setC(v); setOpen(false); onSaved?.(); toast.success("Preferências de privacidade salvas."); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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
          <Button variant="outline" onClick={() => salvar(NENHUM)}>Recusar opcionais</Button>
          <Button variant="outline" onClick={() => salvar(c)}>Salvar preferências</Button>
          <Button variant="outline" onClick={() => salvar(TODOS)}>Aceitar todos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PrivacyPreferences({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  return <PreferencesDialog open={open} setOpen={setOpen} trigger={<button type="button" className={triggerClassName}>Preferências de privacidade</button>} />;
}

/** Aviso exibido a quem ainda não registrou uma escolha (ou quando a versão do consentimento muda). */
export function CookieBanner() {
  const [visivel, setVisivel] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setVisivel(readConsent() === null);
    const h = () => setVisivel(false);
    window.addEventListener("tipe:consent", h);
    return () => window.removeEventListener("tipe:consent", h);
  }, []);
  if (!visivel) return <PreferencesDialog open={open} setOpen={setOpen} />;
  const decidir = (v: Escolha) => { saveConsent(v); setVisivel(false); };
  return (
    <>
      <div role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border/40 bg-background/60 p-4 text-foreground shadow-lg backdrop-blur-md sm:inset-x-6 sm:bottom-6">
        <p className="text-xs leading-5 text-muted-foreground">
          Usamos cookies para o site funcionar e, com o seu aceite, para melhorar sua experiência. <Link to="/cookies" className="font-medium text-primary underline-offset-2 hover:underline">Saiba mais</Link>
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" onClick={() => decidir(TODOS)}>Aceitar tudo</Button>
          <Button size="sm" variant="outline" onClick={() => decidir(NENHUM)}>Recusar opcionais</Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Escolher</Button>
        </div>
      </div>
      <PreferencesDialog open={open} setOpen={setOpen} onSaved={() => setVisivel(false)} />
    </>
  );
}
