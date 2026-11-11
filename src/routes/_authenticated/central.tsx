import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  Banknote,
  Bot,
  Building2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { FounderMfaGate } from "@/components/tipe/FounderMfaGate";
import { Shell, type GrupoNav, type AcaoBusca } from "@/components/tipe/painel/Shell";
import { supabase } from "@/integrations/supabase/client";
import { getCentralDashboard } from "@/lib/tipe/central.functions";
import { VisaoGeral } from "@/components/tipe/central/VisaoGeral";
import { Comercial } from "@/components/tipe/central/Comercial";
import { Comunicacao } from "@/components/tipe/central/Comunicacao";
import { Restaurantes } from "@/components/tipe/central/Restaurantes";
import { Financeiro } from "@/components/tipe/central/Financeiro";
import { Inteligencia } from "@/components/tipe/central/Inteligencia";
import { PerfilConta, useMeuPerfil } from "@/components/tipe/PerfilConta";
import { Administracao } from "@/components/tipe/central/Administracao";

const SECOES = ["inicio", "comercial", "comunicacao", "restaurantes", "financeiro", "inteligencia", "administracao", "perfil"] as const;
export type SecaoCentral = (typeof SECOES)[number];

export const Route = createFileRoute("/_authenticated/central")({
  validateSearch: z.object({
    s: z.enum(SECOES).optional(),
    aba: z.string().max(40).optional(),
    id: z.string().max(80).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Central Tipe" },
      { name: "description", content: "Área exclusiva do fundador: comercial, comunicação, restaurantes, financeiro, inteligência e administração." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <FounderMfaGate>
      <Central />
    </FounderMfaGate>
  ),
});

const TITULOS: Record<SecaoCentral, { t: string; d: string }> = {
  inicio: { t: "Visão geral", d: "O que precisa da sua atenção e os números do período." },
  comercial: { t: "Comercial", d: "Funil, leads, tarefas e etapas. Dados reais da lista de espera." },
  comunicacao: { t: "Comunicação", d: "WhatsApp oficial e histórico de e-mails. Nada sai sem você clicar." },
  restaurantes: { t: "Restaurantes", d: "Ficha única, assinaturas, implantações e integrações." },
  financeiro: { t: "Financeiro", d: "Volume processado não é receita. Receita da Tipe: 30% das gorjetas e assinaturas." },
  inteligencia: { t: "Inteligência", d: "Lebre do fundador, automações e limites. Só rascunhos: nenhuma ação sem aprovação." },
  administracao: { t: "Administração", d: "Segurança, auditoria, privacidade, dispositivos e lançamentos." },
  perfil: { t: "Perfil", d: "Seu nome, e-mail de acesso e senha." },
};

export function useSecao() {
  const navigate = useNavigate({ from: "/central" });
  const search = Route.useSearch();
  const ir = (s: SecaoCentral, aba?: string, id?: string) =>
    navigate({ search: { s, ...(aba ? { aba } : {}), ...(id ? { id } : {}) } });
  return { secao: (search.s ?? "inicio") as SecaoCentral, aba: search.aba, id: search.id, ir };
}

function Central() {
  const { secao, aba, id, ir } = useSecao();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getCentralDashboard);
  const dash = useQuery({ queryKey: ["central-dash", 30], queryFn: () => fetchDash({ data: { dias: 30 } }), refetchInterval: 60_000 });
  const k = dash.data?.kpis;
  const meu = useMeuPerfil();

  const grupos: GrupoNav[] = [
    { l: "Visão geral", itens: [{ k: "inicio", l: "Início", i: LayoutDashboard, badge: k?.pendencias, badgeTone: "warning", busca: "atenção pendências dashboard" }] },
    { l: "Comercial", itens: [{ k: "comercial", l: "Funil e leads", i: Target, badge: k?.oportunidadesAbertas, badgeTone: "neutral", busca: "crm kanban tarefas etapas" }] },
    { l: "Comunicação", itens: [{ k: "comunicacao", l: "WhatsApp e e-mail", i: MessageSquare, badge: k?.mensagensAguardando, badgeTone: "warning", busca: "resend inbox mensagens" }] },
    { l: "Restaurantes", itens: [{ k: "restaurantes", l: "Clientes", i: Building2, badge: k?.emImplantacao, badgeTone: "neutral", busca: "assinaturas implantação integrações pdv" }] },
    { l: "Financeiro", itens: [{ k: "financeiro", l: "Financeiro", i: Banknote, badge: k?.saquesPendentes, badgeTone: "warning", busca: "receita gmv gorjetas saques planos" }] },
    { l: "Inteligência", itens: [{ k: "inteligencia", l: "Lebre e automações", i: Bot, badge: k?.automacoesFalhas, badgeTone: "warning", busca: "ia assistente regras limites" }] },
    { l: "Administração", itens: [{ k: "administracao", l: "Segurança", i: ShieldCheck, busca: "auditoria privacidade dispositivos lançamentos" }, { k: "perfil", l: "Perfil", i: UserRound, busca: "nome conta senha sair" }] },
  ];

  const busca: AcaoBusca[] = (dash.data?.atencao ?? []).slice(0, 30).map((a) => ({
    k: a.id, l: a.titulo, grupo: "Precisa da sua atenção", d: a.quem, onSelect: () => ir(a.abrir.secao as SecaoCentral, a.abrir.aba, a.abrir.id),
  }));

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  const comum = { aba, id, ir };
  return (
    <Shell
      ambiente="Central Tipe"
      usuario={{ nome: meu.data?.nome || meu.data?.email.split("@")[0] || "Fundador", funcao: "Fundador", detalhe: "Tipe" }}
      onSair={sair}
      contexto="Área do fundador"
      grupos={grupos}
      ativo={secao}
      onNavegar={(s) => ir(s as SecaoCentral)}
      titulo={TITULOS[secao].t}
      descricao={TITULOS[secao].d}
      busca={busca}
      rodape={
        <button type="button" onClick={sair} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
          <LogOut className="size-4" /> Sair
        </button>
      }
    >
      {secao === "inicio" && <VisaoGeral dash={dash.data} carregando={dash.isPending} ir={ir} />}
      {secao === "comercial" && <Comercial {...comum} />}
      {secao === "comunicacao" && <Comunicacao {...comum} />}
      {secao === "restaurantes" && <Restaurantes {...comum} />}
      {secao === "financeiro" && <Financeiro {...comum} />}
      {secao === "inteligencia" && <Inteligencia {...comum} />}
      {secao === "administracao" && <Administracao {...comum} />}
      {secao === "perfil" && <div className="max-w-xl"><PerfilConta funcao="Fundador" onSair={sair} /></div>}
    </Shell>
  );
}
