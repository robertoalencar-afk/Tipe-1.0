import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HareOutline } from "@/components/tipe/HareOutline";
import { readConsent, saveConsent, type ConsentCategory } from "@/lib/tipe/consent";
import { cn } from "@/lib/utils";

const CATS: { id: ConsentCategory | "necessary"; name: string; desc: string }[] = [
  {
    id: "necessary",
    name: "Necessários",
    desc: "Login da área do restaurante, identificação local na mesa, conclusão do cadastro e suas preferências de privacidade. Sem eles o serviço não funciona.",
  },
  {
    id: "analytics",
    name: "Medição",
    desc: "Entender quantas pessoas visitam o site e quais páginas usam (Google Analytics).",
  },
  {
    id: "marketing",
    name: "Marketing",
    desc: "Medir e melhorar anúncios nas redes sociais (Meta Pixel).",
  },
];

type Escolha = { functional: boolean; analytics: boolean; marketing: boolean };
const NENHUM: Escolha = { functional: true, analytics: false, marketing: false };
const TODOS: Escolha = { functional: true, analytics: true, marketing: true };

// Aceitar e recusar têm exatamente o mesmo peso visual (orientação da ANPD: recusar não pode ser mais difícil).
const btn =
  "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2";
const btnSolid = cn(btn, "bg-ink text-white hover:bg-ink-soft");
const btnGhost = cn(
  btn,
  "border border-border bg-surface text-foreground hover:border-foreground/30",
);

function PreferencesDialog({
  open,
  setOpen,
  trigger,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  trigger?: React.ReactNode;
  onSaved?: () => void;
}) {
  const [c, setC] = useState<Escolha>(NENHUM);
  useEffect(() => {
    if (!open) return;
    const s = readConsent();
    setC(s ? { functional: s.functional, analytics: s.analytics, marketing: s.marketing } : NENHUM);
  }, [open]);
  const salvar = (v: Escolha) => {
    saveConsent(v);
    setC(v);
    setOpen(false);
    onSaved?.();
    toast.success("Preferências de privacidade salvas.");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[88svh] max-w-[calc(100%-1.5rem)] gap-0 overflow-y-auto rounded-[1.75rem] p-6 sm:max-w-lg sm:p-7">
        <DialogHeader className="text-left">
          <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
            <HareOutline className="h-6 w-6" />
          </span>
          <DialogTitle className="font-display text-2xl font-semibold tracking-heading">
            Suas preferências
          </DialogTitle>
          <DialogDescription className="text-[0.95rem] leading-relaxed">
            Medição e marketing só carregam com o seu aceite e começam desligados. Você pode mudar
            quando quiser pelo link “Preferências de privacidade”, no rodapé.
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-5 divide-y divide-border rounded-2xl border border-border">
          {CATS.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold" id={`cat-${k.id}`}>
                  {k.name}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{k.desc}</p>
              </div>
              {k.id === "necessary" ? (
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-strong">
                  Sempre ativos
                </span>
              ) : (
                <Switch
                  aria-labelledby={`cat-${k.id}`}
                  checked={c[k.id as keyof Escolha]}
                  onCheckedChange={(v) => setC({ ...c, [k.id]: v })}
                />
              )}
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" className={btnGhost} onClick={() => salvar(NENHUM)}>
            Recusar opcionais
          </button>
          <button type="button" className={btnGhost} onClick={() => salvar(TODOS)}>
            Aceitar todos
          </button>
          <button type="button" className={cn(btnSolid, "sm:col-span-2")} onClick={() => salvar(c)}>
            Salvar minhas escolhas
          </button>
        </div>
        <Link
          to="/legal/$livro"
          params={{ livro: "cookies" }}
          className="mt-4 text-center text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          Ler a Política de Cookies
        </Link>
      </DialogContent>
    </Dialog>
  );
}

export function PrivacyPreferences({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <PreferencesDialog
      open={open}
      setOpen={setOpen}
      trigger={
        <button type="button" className={triggerClassName}>
          Preferências de privacidade
        </button>
      }
    />
  );
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
  const decidir = (v: Escolha) => {
    saveConsent(v);
    setVisivel(false);
  };
  return (
    <>
      <section
        role="region"
        aria-labelledby="cookie-title"
        className="pop-in fixed inset-x-3 bottom-3 z-50 rounded-[1.6rem] border border-border bg-surface/95 p-4 text-foreground shadow-[0_24px_60px_-20px_oklch(0.2_0.04_250/0.35)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[25rem] sm:p-5"
        style={{ "--d": "600ms" } as React.CSSProperties}
      >
        <div className="flex gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
            <HareOutline className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p
              id="cookie-title"
              className="font-display text-[1.05rem] font-semibold tracking-heading"
            >
              Cookies, só com o seu ok.
            </p>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-muted-foreground">
              Os necessários fazem o site funcionar. Medição e marketing só entram se você aceitar.{" "}
              <Link
                to="/legal/$livro"
                params={{ livro: "cookies" }}
                className="font-semibold text-foreground underline underline-offset-2"
              >
                Política de Cookies
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={btnGhost} onClick={() => decidir(NENHUM)}>
            Recusar
          </button>
          <button type="button" className={btnGhost} onClick={() => decidir(TODOS)}>
            Aceitar todos
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 w-full rounded-full py-2 text-center text-[0.85rem] font-semibold text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Personalizar preferências
        </button>
      </section>
      <PreferencesDialog open={open} setOpen={setOpen} onSaved={() => setVisivel(false)} />
    </>
  );
}
