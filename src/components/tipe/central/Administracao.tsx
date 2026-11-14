import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Esqueleto, Kpi, Painel, Segmentado, StatusBadge, Tabela, horaBR } from "@/components/tipe/painel/ui";
import { PaymentIntegration } from "./PaymentIntegration";
import { LaunchStatesAdmin } from "@/components/tipe/LaunchStatesAdmin";
import { getAdministracaoCentral } from "@/lib/tipe/central.functions";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["pagamentos", "API de pagamentos"], ["auditoria", "Auditoria"], ["privacidade", "Privacidade"], ["dispositivos", "Dispositivos"], ["lancamentos", "Lançamentos"]] as const;

export function Administracao({ aba, ir }: Props) {
  const atual = ABAS.some(([k]) => k === aba) ? (aba as (typeof ABAS)[number][0]) : "auditoria";
  const q = useQuery({ queryKey: ["central-adm"], queryFn: useServerFn(getAdministracaoCentral) });
  if (q.isPending || !q.data) return <Esqueleto linhas={5} />;
  const d = q.data;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Fundadores" value={d.usuariosInternos} hint="Acesso exige 2FA" />
        <Kpi label="Eventos recentes" value={d.seguranca.length} />
        <Kpi label="Negados" value={d.seguranca.filter((e: any) => e.result === "denied").length} tone={d.seguranca.some((e: any) => e.result === "denied") ? "warning" : undefined} />
        <Kpi label="Pedidos de privacidade" value={d.privacidade.filter((p: any) => p.status !== "done" && p.status !== "closed").length} />
      </div>
      <Segmentado label="Seção" value={atual} onChange={(a) => ir("administracao", a)} options={ABAS} />
      {atual === "pagamentos" && <PaymentIntegration />}
      {atual === "auditoria" && (
        <Painel semPadding titulo="Trilha de auditoria" descricao="Últimos 200 eventos de segurança e ações sensíveis">
          <Tabela densa linhas={d.seguranca} chave={(e: any) => e.id} vazio="Sem eventos." colunas={[
            { k: "q", l: "Quando", c: (e: any) => horaBR(e.created_at) }, { k: "a", l: "Ação", c: (e: any) => <code className="text-xs">{e.action}</code> },
            { k: "r", l: "Restaurante", md: true, c: (e: any) => e.restaurant_slug ?? "—" },
            { k: "s", l: "Resultado", c: (e: any) => <StatusBadge tone={e.result === "ok" ? "success" : e.result === "denied" ? "warning" : "error"}>{e.result}</StatusBadge> },
            { k: "d", l: "Detalhe", md: true, c: (e: any) => e.detail ?? "—" },
          ]} />
        </Painel>
      )}
      {atual === "privacidade" && (
        <Painel semPadding titulo="Pedidos de privacidade (LGPD)">
          <Tabela linhas={d.privacidade} chave={(p: any) => p.id} vazio="Nenhum pedido." colunas={[{ k: "q", l: "Quando", c: (p: any) => horaBR(p.created_at) }, { k: "t", l: "Tipo", c: (p: any) => p.request_type }, { k: "n", l: "Titular", c: (p: any) => `${p.name} · ${p.email}` }, { k: "s", l: "Status", c: (p: any) => <StatusBadge tone={p.status === "done" ? "success" : "warning"}>{p.status}</StatusBadge> }]} />
        </Painel>
      )}
      {atual === "dispositivos" && (
        <Painel semPadding titulo="Seus dispositivos de confiança">
          <Tabela linhas={d.dispositivos} chave={(x: any) => x.device_hash} vazio="Nenhum dispositivo." colunas={[{ k: "h", l: "Dispositivo", c: (x: any) => <code className="text-xs">{String(x.device_hash).slice(0, 10)}…</code> }, { k: "p", l: "Primeiro acesso", c: (x: any) => horaBR(x.first_seen_at) }, { k: "u", l: "Último acesso", c: (x: any) => horaBR(x.last_seen_at) }]} />
        </Painel>
      )}
      {atual === "lancamentos" && <LaunchStatesAdmin />}
    </div>
  );
}
