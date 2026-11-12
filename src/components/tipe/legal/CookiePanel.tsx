import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { readConsent, saveConsent } from "@/lib/tipe/consent";

/** Painel de preferências dentro do Livro 4. Usa o mesmo registro do aviso de cookies. */
export function CookiePanel() {
  const [c, setC] = useState({ analytics: false, marketing: false });
  useEffect(() => {
    const s = readConsent(); if (s) setC({ analytics: s.analytics, marketing: s.marketing });
    const h = () => { const n = readConsent(); if (n) setC({ analytics: n.analytics, marketing: n.marketing }); };
    window.addEventListener("tipe:consent", h); return () => window.removeEventListener("tipe:consent", h);
  }, []);
  const rows = [
    { id: "necessary", name: "Necessários", desc: "Mesa, login, segurança e registro das suas escolhas.", locked: true },
    { id: "analytics", name: "Medição", desc: "Medir o uso do site e contar aberturas de fotos e toques em adicionar no cardápio, sem identificar o cliente nos contadores.", locked: false },
    { id: "marketing", name: "Marketing", desc: "Medir e melhorar anúncios nas redes sociais.", locked: false },
  ] as const;
  return (
    <section data-noprint aria-labelledby="painel-cookies" className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h3 id="painel-cookies" className="font-display text-base font-bold">Suas preferências de cookies</h3>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
            <div><p className="text-sm font-semibold">{r.name}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{r.desc}</p></div>
            {r.locked
              ? <Switch checked disabled aria-label="Necessários, sempre ligados" />
              : <Switch aria-label={r.name} checked={c[r.id]} onCheckedChange={(v) => setC({ ...c, [r.id]: v })} />}
          </li>
        ))}
      </ul>
      <Button className="mt-4" onClick={() => { saveConsent({ functional: true, ...c }); toast.success("Preferências salvas."); }}>Salvar preferências</Button>
    </section>
  );
}
