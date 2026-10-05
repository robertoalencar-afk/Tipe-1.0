import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — TIPE" },
      { name: "description", content: "Defina uma nova senha para acessar o painel TIPE." },
      { property: "og:title", content: "Nova senha — TIPE" },
      { property: "og:description", content: "Redefinição de senha da equipe TIPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível salvar. Abra novamente o link do e-mail ou escolha uma senha mais forte.");
    } else {
      toast.success("Senha atualizada");
      navigate({ to: new URLSearchParams(window.location.search).has("garcom") ? "/garcom" : "/painel" });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={salvar} className="w-full max-w-sm space-y-4 rounded-[2rem] border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Defina sua nova senha</h1>
        <Input type="password" required minLength={8} placeholder="Nova senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={carregando}>Salvar senha</Button>
      </form>
    </main>
  );
}
