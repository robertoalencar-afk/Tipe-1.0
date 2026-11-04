import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MfaGate } from "@/components/tipe/FounderMfaGate";
import { SenhaForteInput } from "@/components/tipe/SenhaForte";
import { avaliarSenha, mensagemErroSenha } from "@/lib/tipe/senha";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — TIPE" },
      { name: "description", content: "Defina uma nova senha para acessar o painel TIPE." },
      { property: "og:title", content: "Nova senha — TIPE" },
      { property: "og:description", content: "Redefinição de senha da equipe TIPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <MfaGate>
      <ResetPassword />
    </MfaGate>
  ),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [email, setEmail] = useState("");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const forca = avaliarSenha(senha, { email });
    if (!forca.ok) return void toast.error(`Senha fraca: ${forca.faltam.join(", ").toLowerCase()}.`);
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      toast.error(mensagemErroSenha(error.message) ?? "Não foi possível salvar. Abra novamente o link do e-mail e tente de novo.");
    } else {
      toast.success("Senha atualizada");
      navigate({ to: new URLSearchParams(window.location.search).has("garcom") ? "/garcom" : "/painel" });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={salvar} className="w-full max-w-sm space-y-4 rounded-[2rem] border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Defina sua nova senha</h1>
        <SenhaForteInput id="nova-senha" label="Nova senha" value={senha} onChange={setSenha} contexto={{ email }} />
        <Button type="submit" className="w-full" disabled={carregando}>Salvar senha</Button>
      </form>
    </main>
  );
}
