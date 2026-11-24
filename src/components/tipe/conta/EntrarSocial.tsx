import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Entrar com Google, Apple ou Facebook (Supabase OAuth).
// Apple e Facebook só aparecem quando o provedor está ligado no Supabase
// (Authentication › Sign In / Providers): o botão nunca leva a um erro.
type Provedor = "google" | "apple" | "facebook";

const NOMES: Record<Provedor, string> = { google: "Google", apple: "Apple", facebook: "Facebook" };
const ORDEM: Provedor[] = ["google", "apple", "facebook"];

let cache: Promise<Record<string, boolean>> | null = null;
function provedoresLigados(): Promise<Record<string, boolean>> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return Promise.resolve({ google: true });
  cache ??= fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((s: { external?: Record<string, boolean> }) => s.external ?? { google: true })
    .catch(() => {
      cache = null;
      return { google: true };
    });
  return cache;
}

function Icone({ p }: { p: Provedor }) {
  if (p === "apple")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
        <path d="M16.37 12.67c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.29-.88-2.3-3.5ZM14.2 6.2c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.55 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.96-.5 2.57-1.23Z" />
      </svg>
    );
  if (p === "facebook")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        <path
          fill="#1877F2"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.92l-3.87-3A7.2 7.2 0 0 1 12 19.25a7.15 7.15 0 0 1-6.72-4.94h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.31a7.2 7.2 0 0 1 0-4.62v-3.1h-4a12 12 0 0 0 0 10.82l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.43-3.44A12 12 0 0 0 1.28 6.59l4 3.1A7.15 7.15 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

/** Botões "Continuar com …" para os provedores ligados no Supabase. */
export function EntrarSocial({ redirectTo }: { redirectTo: string }) {
  const [ligados, setLigados] = useState<Provedor[]>(["google"]);

  useEffect(() => {
    let vivo = true;
    void provedoresLigados().then((ext) => {
      if (vivo) setLigados(ORDEM.filter((p) => ext[p]));
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function entrar(p: Provedor) {
    const { error } = await supabase.auth.signInWithOAuth({ provider: p, options: { redirectTo } });
    if (error) toast.error(`Não foi possível entrar com ${NOMES[p]}`);
  }

  return (
    <div className="space-y-2">
      {ligados.map((p) => (
        <Button
          key={p}
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-2"
          onClick={() => void entrar(p)}
        >
          <Icone p={p} />
          Continuar com {NOMES[p]}
        </Button>
      ))}
    </div>
  );
}
