import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Workflow } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  Btn,
  brlShort,
  DemoNote,
  Empty,
  IconBtn,
  PageHeader,
  Panel,
  Pill,
  TextInput,
} from "@/components/tipe/crm/ui";
import { newId } from "@/lib/tipe/crm/engine";
import { PLANS } from "@/lib/tipe/crm/permissions";
import type { Stage } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/funis")({ component: Funis });

function Funis() {
  const { can, run } = useCrm();
  const d = useOrgData();
  const [selected, setSelected] = useState(d.pipelines[0]?.id ?? "");
  const pipeline = d.pipelines.find((p) => p.id === selected) ?? d.pipelines[0];
  const [stages, setStages] = useState<Stage[]>(pipeline?.stages ?? []);
  const [name, setName] = useState("");
  useEffect(() => setStages(pipeline?.stages ?? []), [pipeline?.id, pipeline?.stages]);
  const manage = can("pipelines.manage");
  const dirty = JSON.stringify(stages) !== JSON.stringify(pipeline?.stages);
  const limit = d.subscription ? PLANS[d.subscription.planId].limits.pipelines : 0;
  const count = (stId: string) => d.deals.filter((x) => x.stageId === stId);

  const update = (i: number, patch: Partial<Stage>) =>
    setStages((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const swap = (i: number, j: number) =>
    setStages((s) => {
      const n = [...s];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Funis"
        description="Etapas configuráveis de cada funil comercial. A probabilidade de cada etapa entra na receita projetada."
      />
      {!manage && (
        <DemoNote>
          Seu papel pode consultar os funis. Somente gestores e administradores alteram etapas.
        </DemoNote>
      )}
      <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Panel
          title="Funis"
          description={`${d.pipelines.length} de ${limit} no seu plano`}
          className="h-fit"
          bodyClassName="p-2"
        >
          <ul className="space-y-1">
            {d.pipelines.map((p) => {
              const open = d.deals.filter((x) => x.pipelineId === p.id && x.status === "aberta");
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p.id)}
                    aria-current={p.id === pipeline?.id}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted ${p.id === pipeline?.id ? "bg-muted" : ""}`}
                  >
                    <span className="block font-medium">{p.name}</span>
                    <span className="text-muted-foreground">
                      {open.length} abertas · {brlShort(open.reduce((a, x) => a + x.value, 0))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {manage && (
            <form
              className="mt-2 flex gap-1.5 border-t border-border p-1 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const r = run({ type: "createPipeline", name }, "Funil criado");
                if (r.ok) {
                  setName("");
                  setSelected(r.id!);
                }
              }}
            >
              <TextInput
                aria-label="Nome do novo funil"
                placeholder="Novo funil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
              <Btn type="submit" disabled={name.trim().length < 3} aria-label="Criar funil">
                <Plus className="h-4 w-4" />
              </Btn>
            </form>
          )}
        </Panel>

        {!pipeline ? (
          <Empty icon={Workflow} title="Nenhum funil" text="Crie o primeiro funil ao lado." />
        ) : (
          <Panel
            title={pipeline.name}
            description="Ordem, nome e probabilidade de cada etapa"
            actions={
              <Link
                to="/crm/oportunidades"
                search={{ funil: pipeline.id }}
                className="text-xs text-primary hover:underline"
              >
                Abrir quadro
              </Link>
            }
          >
            <ol className="space-y-2">
              {stages.map((st, i) => {
                const n = count(st.id).length;
                return (
                  <li
                    key={st.id}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_auto] items-center gap-2 rounded-lg border border-border bg-background/40 p-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_6rem_6rem_auto]"
                  >
                    <span className="money text-center text-xs text-muted-foreground">{i + 1}</span>
                    <TextInput
                      aria-label={`Nome da etapa ${i + 1}`}
                      value={st.name}
                      disabled={!manage}
                      onChange={(e) => update(i, { name: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <TextInput
                        aria-label={`Probabilidade da etapa ${st.name}`}
                        type="number"
                        min={0}
                        max={100}
                        value={st.probability}
                        disabled={!manage || st.kind !== "aberta"}
                        onChange={(e) => update(i, { probability: Number(e.target.value) })}
                        className="h-8 w-16 text-xs"
                      />
                      %
                    </label>
                    <span className="hidden sm:block">
                      {st.kind === "ganho" ? (
                        <Pill tone="success">Ganho</Pill>
                      ) : st.kind === "perdido" ? (
                        <Pill tone="danger">Perdido</Pill>
                      ) : (
                        <Pill>{n} oport.</Pill>
                      )}
                    </span>
                    {manage && (
                      <span className="flex">
                        <IconBtn
                          label="Subir etapa"
                          icon={ArrowUp}
                          disabled={i === 0}
                          onClick={() => swap(i, i - 1)}
                        />
                        <IconBtn
                          label="Descer etapa"
                          icon={ArrowDown}
                          disabled={i === stages.length - 1}
                          onClick={() => swap(i, i + 1)}
                        />
                        <IconBtn
                          label={
                            n
                              ? `Etapa com ${n} oportunidades: mova antes de remover`
                              : "Remover etapa"
                          }
                          icon={Trash2}
                          disabled={st.kind !== "aberta" || n > 0}
                          onClick={() => setStages((s) => s.filter((_, j) => j !== i))}
                        />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {manage && (
              <div className="mt-3 flex flex-wrap justify-between gap-2">
                <Btn
                  variant="outline"
                  onClick={() => {
                    const at = stages.findIndex((s) => s.kind !== "aberta");
                    const n = [...stages];
                    n.splice(at < 0 ? n.length : at, 0, {
                      id: newId("stg"),
                      name: "Nova etapa",
                      probability: 50,
                      kind: "aberta",
                    });
                    setStages(n);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar etapa
                </Btn>
                <span className="flex gap-2">
                  {dirty && (
                    <Btn variant="ghost" onClick={() => setStages(pipeline.stages)}>
                      Descartar
                    </Btn>
                  )}
                  <Btn
                    disabled={!dirty}
                    onClick={() =>
                      run(
                        { type: "updateStages", pipelineId: pipeline.id, stages },
                        "Etapas salvas",
                      )
                    }
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar etapas
                  </Btn>
                </span>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
