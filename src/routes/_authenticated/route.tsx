import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/entrar" });
    return { user: data.user };
  },
  // Quem ativou a verificação em duas etapas confirma o código antes de qualquer área.
  component: () => (
    <MfaGate>
      <Outlet />
    </MfaGate>
  ),
});
