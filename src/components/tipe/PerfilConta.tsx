import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Usuário logado (nome de exibição vem do metadado full_name; nunca usado para permissão). */
export function useMeuPerfil() {
  return useQuery({
    queryKey: ["meu-perfil"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const nome = typeof u?.user_metadata?.["full_name"] === "string" ? (u.user_metadata["full_name"] as string) : "";
      return { email: u?.email ?? "", nome };
    },
    staleTime: 60_000,
  });
}

/** Cartão "Minha conta": nome, e-mail, função, troca de senha e sair. */
export function PerfilConta({ funcao, onSair }: { funcao: string; onSair?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const q = useMeuPerfil();
  const [nome, setNome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valor = nome ?? q.data?.nome ?? "";
  async function salvar() {
    const v = valor.trim();
    if (v.length < 2 || v.length > 80) { toast.error("Digite um nome entre 2 e 80 letras"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: v } });
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar o nome. Tente de novo."); return; }
    await qc.invalidateQueries({ queryKey: ["meu-perfil"] });
    setNome(null);
    toast.success("Nome atualizado");
  }
  return (
    <section className="surface-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-display font-semibold">Minha conta</h2>
        <p className="text-xs text-muted-foreground">Como você aparece no painel. O nome é só de exibição.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="perfil-nome" className="text-sm font-medium">Nome</label>
        <Input id="perfil-nome" value={valor} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Função</dt><dd className="font-semibold">{funcao}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-muted-foreground">E-mail de acesso</dt><dd className="truncate font-semibold">{q.data?.email || "—"}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button onClick={salvar} disabled={busy || nome === null}>Salvar nome</Button>
        <Button variant="outline" asChild><Link to="/esqueci-a-senha">Alterar senha</Link></Button>
        {onSair && <Button variant="ghost" onClick={onSair}><LogOut className="mr-1.5 size-4" />Sair</Button>}
      </div>
    </section>
  );
}
