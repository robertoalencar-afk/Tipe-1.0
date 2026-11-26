import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { z } from "zod";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AreaShell } from "@/components/tipe/AreaShell";
import { Button } from "@/components/ui/button";
import { getMyAccess } from "@/lib/tipe/staff.functions";

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: z.object({ r: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Painel do restaurante — TIPE" },
      { name: "description", content: "Acompanhe as mesas e confirme pagamentos presenciais em tempo real." },
      { property: "og:title", content: "Painel do restaurante — TIPE" },
      { property: "og:description", content: "Espelho das mesas do PDV e confirmação de pagamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { r } = Route.useSearch();
  const fetchAccess = useServerFn(getMyAccess);
  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  const slug = r ?? access.data?.restaurants[0]?.slug;
  useEffect(() => {
    if (access.data?.isFounder) { navigate({ to: "/central", replace: true }); return; }
    if (access.data && !access.data.isFounder && access.data.roles.length > 0 && access.data.roles.every((x) => x.role === "waiter")) { navigate({ to: "/garcom", replace: true }); return; }
    if (access.data && !access.data.isFounder && access.data.restaurants.length === 1) navigate({ to: "/$restaurante", params: { restaurante: access.data.restaurants[0]!.slug }, replace: true });
  }, [access.data, navigate]);

  return (
    <AreaShell eyebrow="Meus restaurantes" actions={<Button size="sm" variant="ghost" onClick={sair} className="text-muted-foreground"><LogOut className="h-4 w-4" />Sair</Button>}>
      <div className="mx-auto max-w-4xl">
        {access.isLoading && <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-24 tipe-brilho rounded-2xl bg-surface motion-reduce:animate-none" />)}</div>}
        {access.error && <p className="text-destructive">{(access.error as Error).message}</p>}
        {access.data && !slug && <SemAcesso isFounder={access.data.isFounder} email={access.data.email} />}
        {access.data && access.data.restaurants.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {access.data.restaurants.map((x) => (
              <Link key={x.slug} to="/$restaurante" params={{ restaurante: x.slug }} className="surface-card p-5 transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-soft">
                <div className="font-display text-lg font-semibold">{x.name}</div>
                <div className="text-sm text-muted-foreground">tipe.digital/{x.slug}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AreaShell>
  );
}

function SemAcesso({ isFounder, email }: { isFounder: boolean; email: string }) {
  if (isFounder) return null;
  return (
    <div className="surface-card mx-auto mt-6 max-w-md p-6 text-center">
      <h1 className="font-display text-lg font-semibold">Você ainda não faz parte de uma equipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">Peça ao dono do restaurante para adicionar o e-mail <strong>{email}</strong> na aba Equipe.</p>
    </div>
  );
}

