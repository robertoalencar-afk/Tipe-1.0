import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Aviso, Esqueleto, Kpi, Painel, Segmentado, StatusBadge, Tabela, horaBR, type Tone } from "@/components/tipe/painel/ui";
import { getReservaCentral } from "@/lib/tipe/central-reserva.functions";
import { ETAPA_LABEL, type EtapaFundador } from "@/lib/tipe/guest/fundador";

const PERIODOS = [[7, "7 d"], [30, "30 d"], [90, "90 d"]] as const;
const TOM: Partial<Record<EtapaFundador, Tone>> = { ativo: "success", apto: "success", piloto: "info", em_testes: "info", em_implantacao: "info", suspenso: "warning", encerrado: "neutral" };
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Central Tipe · Tipe Reserva: parceiros Fundador por etapa, reservas agregadas e mensagens. */
export function ReservaCentral() {
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const fetchR = useServerFn(getReservaCentral);
  const q = useQuery({ queryKey: ["central-reserva", dias], queryFn: () => fetchR({ data: { dias } }), refetchInterval: 60_000 });
  if (q.isPending || !q.data) return <Esqueleto linhas={5} />;
  const d = q.data;
  const ok = (b: boolean, sim: string, nao: string) => <StatusBadge tone={b ? "success" : "warning"}>{b ? sim : nao}</StatusBadge>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Aviso tone="neutral">Tipe Reserva segue “Em breve” para o público. Números agregados: nenhum nome, telefone ou e-mail de cliente aparece aqui.</Aviso>
        <Segmentado label="Período" value={dias} onChange={setDias} options={PERIODOS} />
      </div>

      <Painel titulo="Restaurante Fundador" descricao="Parceiros em cada etapa da trilha">
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-9">
          {d.etapas.map((e, i) => (
            <li key={e.etapa} className="rounded-xl border border-border p-3">
              <p className="text-[11px] text-muted-foreground">{i < 7 ? `${i + 1}. ` : ""}{ETAPA_LABEL[e.etapa]}</p>
              <p className="mt-1 font-display text-2xl tabular-nums">{e.n}</p>
            </li>
          ))}
        </ol>
      </Painel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Reservas" value={d.reservas.reservas} hint={`últimos ${dias} dias`} />
        <Kpi label="Pessoas" value={d.reservas.pessoas} />
        <Kpi label="Honradas" value={d.reservas.honradas} tone="brand" />
        <Kpi label="Canceladas" value={d.reservas.canceladas} />
        <Kpi label="Taxa de falta" value={pct(d.reservas.taxaFalta)} tone={d.reservas.taxaFalta > 0.15 ? "warning" : undefined} />
        <Kpi label="Lista de espera" value={d.reservas.espera} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Painel titulo="Parceiros" semPadding>
          <Tabela
            densa
            linhas={d.parceiros}
            chave={(p) => p.id}
            vazio="Nenhum restaurante no programa ainda."
            colunas={[
              { k: "r", l: "Restaurante", c: (p) => p.restaurante },
              { k: "e", l: "Etapa", c: (p) => <StatusBadge tone={TOM[p.etapa as EtapaFundador] ?? "neutral"}>{ETAPA_LABEL[p.etapa as EtapaFundador] ?? p.etapa}</StatusBadge> },
              { k: "d", l: "Desde", md: true, c: (p) => horaBR(p.desde) },
              { k: "p", l: "Piloto", md: true, c: (p) => (p.piloto ? "Elegível" : "—") },
            ]}
          />
        </Painel>
        <Painel titulo="Mensagens ao cliente" descricao="Confirmação, cancelamento e lista de espera">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">E-mail (Resend) {ok(d.mensagens.email, "Ligado", "Sem chave")}</li>
            <li className="flex items-center justify-between gap-3">WhatsApp (Meta) {ok(d.mensagens.whatsapp, "Chave ok", "Sem chave")}</li>
            <li className="flex items-center justify-between gap-3">Modelos aprovados na Meta {ok(d.mensagens.modelosAprovados, "Aprovados", "Pendentes")}</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Chaves em GitHub → Settings → Environments → producao. Lembrete no dia: em breve.</p>
        </Painel>
      </div>

      <Painel titulo="Por restaurante" semPadding>
        <Tabela
          densa
          linhas={d.porRestaurante}
          chave={(r) => r.id}
          vazio="Sem reservas no período."
          colunas={[
            { k: "n", l: "Restaurante", c: (r) => r.restaurante },
            { k: "r", l: "Reservas", num: true, c: (r) => r.reservas },
            { k: "p", l: "Pessoas", num: true, md: true, c: (r) => r.pessoas },
            { k: "h", l: "Honradas", num: true, c: (r) => r.honradas },
            { k: "f", l: "Faltas", num: true, c: (r) => r.faltas },
            { k: "c", l: "Canceladas", num: true, md: true, c: (r) => r.canceladas },
          ]}
        />
      </Painel>
    </div>
  );
}
