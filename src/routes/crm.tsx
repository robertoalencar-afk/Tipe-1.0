import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CrmProvider } from "@/components/tipe/crm/context";
import { Shell } from "@/components/tipe/crm/Shell";
import { PageSkeleton } from "@/components/tipe/crm/ui";
import { useCrmState } from "@/lib/tipe/crm/store";

// Back office comercial (CRM) da Tipe. No modo demonstração os dados ficam neste navegador;
// a mesma estrutura está descrita para o Supabase na migração do CRM (ver README).
export const Route = createFileRoute("/crm")({
  head: () => ({
    meta: [
      { title: "Back office comercial | Tipe" },
      { name: "description", content: "CRM da Tipe: contatos, leads, funil, atendimento, equipe e assinaturas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CrmLayout,
});

function CrmLayout() {
  const s = useCrmState();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const isLogin = path.startsWith("/crm/entrar");

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("crm-theme");
    return () => html.classList.remove("crm-theme");
  }, []);

  useEffect(() => {
    if (s && !s.session && !isLogin) navigate({ to: "/crm/entrar", search: { voltar: path }, replace: true });
  }, [s, isLogin, path, navigate]);

  return (
    <div className="crm-theme min-h-dvh bg-background text-foreground">
      <TooltipProvider delayDuration={250}>
        {isLogin ? <Outlet /> : !s?.session ? <div className="p-6"><PageSkeleton /></div> : (
          <CrmProvider s={s}>
            <Shell><Outlet /></Shell>
          </CrmProvider>
        )}
      </TooltipProvider>
    </div>
  );
}
