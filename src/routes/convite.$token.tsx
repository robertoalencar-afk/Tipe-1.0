import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { TipeLogo } from "@/components/tipe/Logo";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvite } from "@/lib/tipe/equipe.functions";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite para a equipe | Tipe" },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Convite,
});

function Convite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const aceitar = useServerFn(acceptInvite);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogado(Boolean(data.session)));
  }, []);

  async function entrar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await aceitar({ data: { token } });
      navigate({ to: "/$restaurante", params: { restaurante: r.slug } });
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="surface-card w-full max-w-md space-y-5 p-6 text-center sm:p-8">
        <TipeLogo variant="dark" className="mx-auto h-8" />
        <h1 className="font-display text-xl font-semibold">Você foi convidado para uma equipe</h1>
        <p className="text-sm text-muted-foreground">Entre com a conta do e-mail que recebeu o convite para aceitar. O convite vale uma vez e expira em 7 dias.</p>
        {erro && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
        {logado === false ? (
          <Button asChild variant="brand" className="w-full"><Link to="/entrar" search={{ r: `/convite/${token}` }}>Entrar ou criar conta</Link></Button>
        ) : (
          <Button variant="brand" className="w-full" disabled={enviando || logado === null} onClick={entrar}>Aceitar convite</Button>
        )}
        {logado === false && <p className="text-xs text-muted-foreground">Use o mesmo e-mail do convite. Depois de entrar, você volta para cá para aceitar.</p>}
      </div>
    </main>
  );
}
