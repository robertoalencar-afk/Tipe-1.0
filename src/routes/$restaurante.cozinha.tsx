import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exigirSessao } from "@/integrations/supabase/lazy";
import { Cozinha } from "@/components/tipe/Kds";
import { useOps } from "@/components/tipe/AdminSections";

// Tela cheia da cozinha (KDS) para o tablet ou monitor da produção. Exige login da equipe.
export const Route = createFileRoute("/$restaurante/cozinha")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    if (!(await exigirSessao())) throw redirect({ to: "/entrar", search: { r: `/${params.restaurante}/cozinha` } });
    // Garçom não opera a produção: cozinha e bar usam o link de estação criado pelo administrador.
    const { getMyAccess } = await import("@/lib/tipe/staff.functions");
    const a = await getMyAccess();
    const rest = a.restaurants.find((x) => x.slug === params.restaurante);
    const meus = a.roles.filter((r) => r.restaurantId === rest?.id).map((r) => r.role);
    if (!a.isFounder && meus.length > 0 && meus.every((r) => r === "waiter")) throw redirect({ to: "/garcom" });
  },
  head: () => ({
    meta: [
      { title: "Cozinha — TIPE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <MfaGate>
      <TelaCozinha />
    </MfaGate>
  ),
});

function Relogio() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-display text-lg font-bold tabular-nums">{agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
}

function TelaCozinha() {
  const { restaurante } = Route.useParams();
  const ops = useOps(restaurante);
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 bg-secondary px-4 py-2 text-secondary-foreground">
        <div className="flex items-center gap-3">
          <Link to="/$restaurante" params={{ restaurante }} className="rounded-md p-1 hover:bg-secondary-foreground/10" aria-label="Voltar ao painel"><ArrowLeft className="h-5 w-5" /></Link>
          <span className="font-display font-bold">{ops.data?.restaurant.name ?? "Cozinha"}</span>
        </div>
        <Relogio />
      </header>
      {ops.error ? (
        <p className="p-6 text-destructive">{(ops.error as Error).message}</p>
      ) : (
        <Cozinha slug={restaurante} telaCheia />
      )}
    </div>
  );
}
