import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { usuarioDaSessao } from "@/integrations/supabase/lazy";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await usuarioDaSessao();
    if (!user) throw redirect({ to: "/entrar" });
    return { user };
  },
  component: () => <Outlet />,
});
