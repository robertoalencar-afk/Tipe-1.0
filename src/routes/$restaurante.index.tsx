import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { AreaShell } from "@/components/tipe/AreaShell";
import { AvisosCelular } from "@/components/tipe/AvisosCelular";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exigirSessao } from "@/integrations/supabase/lazy";
import { Button } from "@/components/ui/button";
import { RestaurantPanel } from "@/components/tipe/RestaurantPanel";
import { PartnerTermsNotice } from "@/components/tipe/legal/PartnerTermsNotice";
import { getMyAccess } from "@/lib/tipe/staff.functions";
import { PainelCarregando } from "@/components/tipe/RestaurantPanel";

export const Route = createFileRoute("/$restaurante/")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    if (!(await exigirSessao()))
      throw redirect({ to: "/entrar", search: { r: `/${params.restaurante}` } });
  },
  head: () => ({
    meta: [
      { title: "Área do restaurante — TIPE" },
      {
        name: "description",
        content: "Mesas, pedidos do PDV, QR Codes e confirmação de pagamentos do restaurante.",
      },
      { property: "og:title", content: "Área do restaurante — TIPE" },
      { property: "og:description", content: "Painel do restaurante na TIPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <MfaGate>
      <AreaRestaurante />
    </MfaGate>
  ),
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

  const visibleRestaurant = access.data?.restaurants.find((x) => x.slug === restaurante);
  const myRoles =
    access.data?.roles
      .filter((x) => x.restaurantId === visibleRestaurant?.id && x.role !== "founder")
      .map((x) => x.role) ?? [];
  const r = myRoles.length > 0 ? visibleRestaurant : undefined;

  const acoesTopo = (
    <>
      {(myRoles.includes("owner") ||
        myRoles.includes("manager") ||
        myRoles.includes("cashier")) && <AvisosCelular papel="gestao" />}
    </>
  );
  // Garçom não usa o painel de gestão: a área dele é /garcom.
  const soGarcom = myRoles.length > 0 && myRoles.every((x) => x === "waiter");
  useEffect(() => {
    if (soGarcom) navigate({ to: "/garcom", replace: true });
  }, [soGarcom, navigate]);
  if (soGarcom) return <PainelCarregando />;
  // Com acesso: o painel usa a casca própria do Tipe Gestão (menu lateral, busca, mobile).
  if (r && access.data)
    return (
      <>
        <PartnerTermsNotice />
        <RestaurantPanel
          key={restaurante}
          slug={restaurante}
          myRoles={myRoles}
          isFounder={false}
          topoAcoes={acoesTopo}
          email={access.data.email}
          onSair={sair}
        />
      </>
    );

  return (
    <AreaShell
      eyebrow="Área do restaurante"
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={sair} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </>
      }
    >
      <div>
        {access.isLoading && <PainelCarregando />}
        {access.error && <p className="text-destructive">{(access.error as Error).message}</p>}
        {access.data && !r && (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
            <h1 className="font-display text-lg font-semibold">Sem acesso a este restaurante</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              O endereço não existe ou sua conta ({access.data.email}) não faz parte da equipe. Peça
              ao dono para adicionar você.
            </p>
            <Link to="/painel" className="mt-4 inline-block text-sm underline">
              Ir para meus restaurantes
            </Link>
          </div>
        )}
        {r && access.data && <PartnerTermsNotice />}
        {r && access.data && (
          <RestaurantPanel
            key={restaurante}
            slug={restaurante}
            myRoles={myRoles}
            isFounder={false}
          />
        )}
      </div>
    </AreaShell>
  );
}
