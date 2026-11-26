import { Carregando } from "@/components/tipe/Carregando";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Segmentado } from "@/components/tipe/painel/ui";
import {
  Banknote,
  Bot,
  Building2,
  CalendarCheck,
  GitPullRequest,
  LayoutDashboard,
  MessageCircle,
  Mail,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { TipeSymbol } from "@/components/tipe/Logo";
import { FounderMfaGate } from "@/components/tipe/FounderMfaGate";
import { Shell, type GrupoNav, type AcaoBusca } from "@/components/tipe/painel/Shell";
import { supabase } from "@/integrations/supabase/client";
import { getCentralDashboard } from "@/lib/tipe/central.functions";
import { getAcessoCentral } from "@/lib/tipe/central-equipe.functions";
import { PERFIL_INFO } from "@/lib/tipe/central-perfis";
import { VisaoGeral } from "@/components/tipe/central/VisaoGeral";
import { Comercial } from "@/components/tipe/central/Comercial";
import { Comunicacao, WhatsAppCentral } from "@/components/tipe/central/Comunicacao";
import { Restaurantes } from "@/components/tipe/central/Restaurantes";
import { Financeiro } from "@/components/tipe/central/Financeiro";
import { Inteligencia } from "@/components/tipe/central/Inteligencia";
import { LebreCentral } from "@/components/tipe/central/LebreCentral";
import type { Pendencia } from "@/lib/tipe/pendencias";
import { PerfilConta, useMeuPerfil } from "@/components/tipe/PerfilConta";
import { Administracao } from "@/components/tipe/central/Administracao";

import { Operacoes } from "@/components/tipe/central/Operacoes";
import { ReservaCentral } from "@/components/tipe/central/ReservaCentral";

function InicioInterno({ nome, secoes, ir }: { nome: string; secoes: string[]; ir: (s: SecaoCentral) => void }) {
  const atalhos = secoes.filter((x) => x !== "inicio" && x !== "perfil") as SecaoCentral[];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-extrabold">Olá, {nome}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Você acessa a Central com permissões limitadas à sua função. Se faltar algo, peça ao Roberto.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {atalhos.map((a) => <button key={a} type="button" onClick={() => ir(a)} className="rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/60"><p className="font-semibold">{TITULOS[a].t}</p><p className="mt-1 text-xs text-muted-foreground">{TITULOS[a].d}</p></button>)}
      </div>
    </div>
  );
}

const SECOES = ["inicio", "comercial", "whatsapp", "comunicacao", "restaurantes", "financeiro", "inteligencia", "reserva", "administracao", "operacoes", "perfil"] as const;
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
  whatsapp: { t: "WhatsApp comercial", d: "A Lebre atende 24 horas, qualifica o restaurante e passa para você o que precisa de uma pessoa." },
  comunicacao: { t: "E-mail", d: "Caixa de entrada, envios do sistema e modelos. Nada sai sem você clicar." },
  restaurantes: { t: "Restaurantes", d: "Ficha única, assinaturas, implantações e integrações." },
  financeiro: { t: "Financeiro", d: "Volume processado não é receita. Receita da Tipe: 30% das gorjetas e assinaturas." },
  inteligencia: { t: "Inteligência", d: "Lebre do fundador, automações e limites. Só rascunhos: nenhuma ação sem aprovação." },
  reserva: { t: "Tipe Reserva", d: "Restaurante Fundador por etapa, reservas agregadas e mensagens. Sem dados pessoais de cliente." },
  administracao: { t: "Administração", d: "Segurança, auditoria, privacidade, dispositivos e lançamentos." },
  operacoes: { t: "Operações e produto", d: "PRs, publicações, produtos, infraestrutura e Tipe Pulse. Acompanhamento com evidências e histórico." },
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
  const fetchAcesso = useServerFn(getAcessoCentral);
  const acesso = useQuery({ queryKey: ["central-acesso"], queryFn: () => fetchAcesso(), staleTime: 60_000 });
  const interno = acesso.data?.papel === "interno";
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const dash = useQuery({ queryKey: ["central-dash", dias], enabled: acesso.data?.papel === "founder", queryFn: () => fetchDash({ data: { dias } }), refetchInterval: 60_000 });
  const k = dash.data?.kpis;
  const meu = useMeuPerfil();

  const permitidas = acesso.data?.secoes ?? null; // null = fundador (tudo)
  const gruposTodos: GrupoNav[] = [
    { l: "Visão geral", itens: [{ k: "inicio", l: "Início", i: LayoutDashboard, badge: k?.pendencias, badgeTone: "warning", busca: "atenção pendências dashboard" }] },
    { l: "Comercial", itens: [{ k: "comercial", l: "Funil e leads", i: Target, badge: k?.oportunidadesAbertas, badgeTone: "neutral", busca: "crm kanban tarefas etapas" }] },
    { l: "Comunicação", itens: [{ k: "whatsapp", l: "WhatsApp", i: MessageCircle, badge: k?.mensagensAguardando, badgeTone: "warning", busca: "whatsapp conversas lebre leads demonstração" }, { k: "comunicacao", l: "E-mail", i: Mail, busca: "resend inbox caixa e-mail modelos" }] },
    { l: "Restaurantes", itens: [{ k: "restaurantes", l: "Clientes", i: Building2, badge: k?.emImplantacao, badgeTone: "neutral", busca: "assinaturas implantação integrações pdv" }] },
    { l: "Financeiro", itens: [{ k: "financeiro", l: "Financeiro", i: Banknote, badge: k?.saquesPendentes, badgeTone: "warning", busca: "receita gmv gorjetas saques planos" }] },
    { l: "Inteligência", itens: [{ k: "inteligencia", l: "Lebre e automações", i: Bot, badge: k?.automacoesFalhas, badgeTone: "warning", busca: "ia assistente regras limites" }] },
    { l: "Produtos", itens: [{ k: "reserva", l: "Tipe Reserva", i: CalendarCheck, busca: "reservas fundador parceiros etapas piloto guest" }] },
    { l: "Operações", itens: [{ k: "operacoes", l: "Operações e produto", i: GitPullRequest, busca: "projetos prs github cloudflare supabase domínio produtos pulse nfc testes publicação" }] },
    { l: "Administração", itens: [{ k: "administracao", l: "Segurança", i: ShieldCheck, busca: "auditoria privacidade dispositivos lançamentos" }, { k: "perfil", l: "Perfil", i: UserRound, busca: "nome conta senha sair" }] },
  ];

  const grupos = permitidas ? gruposTodos.map((g) => ({ ...g, itens: g.itens.filter((i) => permitidas.includes(i.k)) })).filter((g) => g.itens.length) : gruposTodos;
  useEffect(() => { if (acesso.data?.papel === "nenhum") navigate({ to: "/painel", replace: true }); }, [acesso.data, navigate]);
  useEffect(() => { if (permitidas && !permitidas.includes(secao)) ir("inicio"); }, [permitidas, secao]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pendências: bolinha vermelha no menu e a Lebre explica cada uma.
  const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios.replace("#", String(n)));
  const pendencias: Pendencia[] = [
    { aba: "inicio", rotulo: "Início", n: k?.pendencias ?? 0, texto: plural(k?.pendencias ?? 0, "Um item precisa da sua atenção hoje.", "# itens precisam da sua atenção hoje.") },
    { aba: "whatsapp", rotulo: "WhatsApp", n: k?.mensagensAguardando ?? 0, texto: plural(k?.mensagensAguardando ?? 0, "Uma mensagem espera resposta.", "# mensagens esperam resposta.") },
    { aba: "financeiro", rotulo: "Financeiro", n: k?.saquesPendentes ?? 0, texto: plural(k?.saquesPendentes ?? 0, "Um saque de gorjeta espera aprovação.", "# saques de gorjeta esperam aprovação.") },
    { aba: "inteligencia", rotulo: "Lebre e automações", n: k?.automacoesFalhas ?? 0, texto: plural(k?.automacoesFalhas ?? 0, "Uma automação falhou.", "# automações falharam.") },
  ].filter((p) => p.n > 0 && (!permitidas || permitidas.includes(p.aba)));

  const busca: AcaoBusca[] = (dash.data?.atencao ?? []).slice(0, 30).map((a) => ({
    k: a.id, l: a.titulo, grupo: "Precisa da sua atenção", d: a.quem, onSelect: () => ir(a.abrir.secao as SecaoCentral, a.abrir.aba, a.abrir.id),
  }));

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  if (!acesso.data) return <Carregando tamanho="tela" texto="Carregando seu acesso" />;
  const comum = { aba, id, ir };
  return (
    <Shell
      ambiente="Central Tipe"
      usuario={{ nome: meu.data?.nome || meu.data?.email.split("@")[0] || (interno ? "Equipe" : "Fundador"), funcao: interno && acesso.data?.perfil ? PERFIL_INFO[acesso.data.perfil].rotulo : "Fundador", detalhe: "Tipe", avatarUrl: meu.data?.avatarUrl }}
      onSair={sair}
      menuConta={[
        { l: "Perfil", i: UserRound, onSelect: () => ir("perfil") },
        ...(interno ? [] : [{ l: "Segurança", i: ShieldCheck, onSelect: () => ir("administracao") }]),
      ]}
      acoes={secao === "inicio" ? <Segmentado label="Período" value={dias} onChange={setDias} options={[[7, "7 d"], [30, "30 d"], [90, "90 d"]] as const} /> : undefined}
      contexto={
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white p-1"><TipeSymbol className="size-7" /></span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-foreground">Tipe</span>
            <span className="block truncate text-[11px] text-muted-foreground">{interno ? "Equipe interna" : "Área do fundador"} · tipe.digital</span>
          </span>
        </span>
      }
      grupos={grupos}
      ativo={secao}
      onNavegar={(s) => ir(s as SecaoCentral)}
      titulo={TITULOS[secao].t}
      descricao={TITULOS[secao].d}
      busca={busca}
    >
      {secao === "inicio" && interno && <InicioInterno nome={meu.data?.nome || acesso.data?.nome || "equipe"} secoes={permitidas ?? []} ir={ir} />}
      {secao === "inicio" && !interno && <VisaoGeral dash={dash.data} carregando={dash.isPending} ir={ir} nome={meu.data?.nome || meu.data?.email.split("@")[0] || "Fundador"} />}
      {secao === "comercial" && <Comercial {...comum} />}
      {secao === "whatsapp" && <WhatsAppCentral {...comum} />}
      {secao === "comunicacao" && <Comunicacao {...comum} />}
      {secao === "restaurantes" && <Restaurantes {...comum} />}
      {secao === "financeiro" && <Financeiro {...comum} />}
      {secao === "inteligencia" && <Inteligencia {...comum} />}
      {secao === "operacoes" && <Operacoes {...comum} />}
      {secao === "reserva" && <ReservaCentral />}
      {secao === "administracao" && <Administracao {...comum} />}
      {!interno && secao !== "inteligencia" && <LebreCentral pendencias={pendencias} onPendencia={(a) => ir(a as SecaoCentral)} />}
      {secao === "perfil" && <div className="max-w-xl"><PerfilConta funcao={interno && acesso.data?.perfil ? PERFIL_INFO[acesso.data.perfil].rotulo : "Fundador"} onSair={sair} /></div>}
    </Shell>
  );
}

