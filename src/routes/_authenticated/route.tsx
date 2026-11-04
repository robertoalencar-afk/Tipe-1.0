import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { usuarioDaSessao } from "@/integrations/supabase/lazy";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await usuarioDaSessao();
    if (!user) throw redirect({ to: "/entrar" });
    return { user };
  },
  // Quem ativou a verificação em duas etapas confirma o código antes de qualquer área.
  component: () => (
    <MfaGate>
      <Outlet />
    </MfaGate>
  ),
});
