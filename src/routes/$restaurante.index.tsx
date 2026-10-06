import { AreaShell } from "@/components/tipe/AreaShell";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RestaurantPanel } from "@/components/tipe/RestaurantPanel";
import { getMyAccess } from "@/lib/tipe/staff.functions";

export const Route = createFileRoute("/$restaurante/")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar", search: { r: `/${params.restaurante}` } });
  },
  head: () => ({
    meta: [
      { title: "Área do restaurante — TIPE" },
      { name: "description", content: "Mesas, pedidos do PDV, QR Codes e confirmação de pagamentos do restaurante." },
      { property: "og:title", content: "Área do restaurante — TIPE" },
      { property: "og:description", content: "Painel do restaurante na TIPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaRestaurante,
});

function AreaRestaurante() {
  const { restaurante } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", search: { r: `/${restaurante}` }, replace: true });
  }

  const r = access.data?.restaurants.find((x) => x.slug === restaurante);
  const myRoles = access.data?.roles.filter((x) => x.restaurantId === r?.id).map((x) => x.role) ?? [];

  return (
    <AreaShell eyebrow="Área do restaurante"
      actions={<>
        {access.data?.isFounder && <Link to="/painel" className="px-2 text-sm underline opacity-80">Todos os restaurantes</Link>}
        <Button size="sm" variant="ghost" onClick={sair} className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"><LogOut className="mr-1 h-4 w-4" />Sair</Button>
      </>}>
      <div>
        {access.isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {access.error && <p className="text-destructive">{(access.error as Error).message}</p>}
        {access.data && !r && (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
            <h1 className="font-display text-lg font-bold">Sem acesso a este restaurante</h1>
            <p className="mt-2 text-sm text-muted-foreground">O endereço não existe ou sua conta ({access.data.email}) não faz parte da equipe. Peça ao dono para adicionar você.</p>
            <Link to="/painel" className="mt-4 inline-block text-sm underline">Ir para meus restaurantes</Link>
          </div>
        )}
        {r && access.data && <RestaurantPanel key={restaurante} slug={restaurante} myRoles={myRoles} isFounder={access.data.isFounder} />}
      </div>
    </AreaShell>
  );
}
