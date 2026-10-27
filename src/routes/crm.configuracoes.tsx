import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RotateCcw, Trash2 } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  Btn,
  ConfirmAction,
  Field,
  NoAccessInline,
  PageHeader,
  Panel,
  TextArea,
  TextInput,
} from "@/components/tipe/crm/ui";
import { resetDemo } from "@/lib/tipe/crm/store";
import type { XpKind } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/configuracoes")({ component: Configuracoes });

const XP_FIELDS: { key: XpKind; label: string }[] = [
  { key: "lead_qualificado", label: "Lead qualificado" },
  { key: "tarefa_concluida", label: "Tarefa concluída" },
  { key: "reuniao_realizada", label: "Reunião realizada" },
  { key: "oportunidade_ganha", label: "Oportunidade ganha" },
  { key: "meta_atingida", label: "Meta atingida" },
];

function Configuracoes() {
  const { org, can, run } = useCrm();
  const { quickReplies } = useOrgData();
  const navigate = useNavigate();
  const edit = can("org.settings");
  const qrEdit = can("inbox.assign");
  const initial = () => ({
    name: org.name,
    sla: String(org.settings.responseSlaMin),
    cap: String(org.settings.dailyTaskXpCap),
    xp: Object.fromEntries(XP_FIELDS.map((f) => [f.key, String(org.settings.xp[f.key])])) as Record<
      XpKind,
      string
    >,
  });
  const [f, setF] = useState(initial);
  useEffect(() => setF(initial()), [org.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [qr, setQr] = useState({ shortcut: "/", text: "" });

  const errs = {
    name: f.name.trim().length < 3 ? "Use pelo menos 3 letras." : undefined,
    sla: Number(f.sla) >= 1 && Number(f.sla) <= 1440 ? undefined : "De 1 a 1440 minutos.",
    cap: Number(f.cap) >= 0 && Number(f.cap) <= 100 ? undefined : "De 0 a 100 tarefas.",
  };
  const xpErr = XP_FIELDS.some((x) => !(Number(f.xp[x.key]) >= 0 && Number(f.xp[x.key]) <= 2000));

  function save(e: FormEvent) {
    e.preventDefault();
    if (errs.name || errs.sla || errs.cap || xpErr) return;
    run(
      {
        type: "updateOrgSettings",
        name: f.name,
        responseSlaMin: Number(f.sla),
        dailyTaskXpCap: Number(f.cap),
        xp: Object.fromEntries(XP_FIELDS.map((x) => [x.key, Number(f.xp[x.key])])),
      },
      "Configurações salvas",
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" description={`Regras da organização ${org.name}.`} />
      <form noValidate onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <Panel title="Organização e atendimento">
          <div className="space-y-3">
            <Field label="Nome da organização" error={errs.name}>
              {(id, dd) => (
                <TextInput
                  id={id}
                  aria-describedby={dd}
                  disabled={!edit}
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                />
              )}
            </Field>
            <Field
              label="Prazo da primeira resposta (minutos)"
              error={errs.sla}
              hint="Conversas sem resposta depois desse prazo aparecem como atrasadas no atendimento e nos relatórios."
            >
              {(id, dd) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1}
                  max={1440}
                  aria-describedby={dd}
                  disabled={!edit}
                  value={f.sla}
                  onChange={(e) => setF({ ...f, sla: e.target.value })}
                />
              )}
            </Field>
            <Field label="Fuso horário">
              {(id) => <TextInput id={id} disabled value={org.settings.timezone} />}
            </Field>
          </div>
        </Panel>
        <Panel
          title="Pontuação da gamificação"
          description="Pontos por fato real. Mudanças valem para os próximos eventos."
        >
          <div className="grid grid-cols-2 gap-2">
            {XP_FIELDS.map((x) => (
              <Field key={x.key} label={x.label}>
                {(id) => (
                  <TextInput
                    id={id}
                    type="number"
                    min={0}
                    max={2000}
                    disabled={!edit}
                    value={f.xp[x.key]}
                    onChange={(e) => setF({ ...f, xp: { ...f.xp, [x.key]: e.target.value } })}
                  />
                )}
              </Field>
            ))}
          </div>
          {xpErr && <p className="mt-2 text-xs text-destructive">Os pontos vão de 0 a 2000.</p>}
          <Field
            label="Tarefas que pontuam por dia, por pessoa"
            error={errs.cap}
            hint="Evita que tarefas em massa inflem o ranking."
            className="mt-3"
          >
            {(id, dd) => (
              <TextInput
                id={id}
                type="number"
                min={0}
                max={100}
                aria-describedby={dd}
                disabled={!edit}
                value={f.cap}
                onChange={(e) => setF({ ...f, cap: e.target.value })}
              />
            )}
          </Field>
        </Panel>
        <div className="flex justify-end gap-2 lg:col-span-2">
          {edit ? (
            <>
              <Btn type="button" variant="ghost" onClick={() => setF(initial())}>
                Descartar mudanças
              </Btn>
              <Btn type="submit">Salvar configurações</Btn>
            </>
          ) : (
            <NoAccessInline text="Somente proprietário e administradores alteram estas configurações." />
          )}
        </div>
      </form>

      <Panel title="Respostas rápidas" description="Digite / no atendimento para usar.">
        <ul className="space-y-1.5">
          {quickReplies.map((q) => (
            <li
              key={q.id}
              className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"
            >
              <code className="shrink-0 font-semibold text-primary">{q.shortcut}</code>
              <span className="min-w-0 flex-1">{q.text}</span>
              {qrEdit && (
                <ConfirmAction
                  title={`Excluir ${q.shortcut}?`}
                  description="A resposta rápida some para toda a equipe."
                  confirmLabel="Excluir resposta"
                  onConfirm={() =>
                    run({ type: "deleteQuickReply", id: q.id }, "Resposta rápida excluída")
                  }
                  trigger={
                    <button
                      type="button"
                      aria-label={`Excluir ${q.shortcut}`}
                      className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  }
                />
              )}
            </li>
          ))}
          {!quickReplies.length && (
            <li className="text-xs text-muted-foreground">Nenhuma resposta rápida.</li>
          )}
        </ul>
        {qrEdit && (
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (run({ type: "createQuickReply", ...qr }, "Resposta rápida criada").ok)
                setQr({ shortcut: "/", text: "" });
            }}
          >
            <TextInput
              aria-label="Atalho"
              value={qr.shortcut}
              onChange={(e) => setQr({ ...qr, shortcut: e.target.value })}
            />
            <TextArea
              aria-label="Texto da resposta"
              className="min-h-9"
              value={qr.text}
              onChange={(e) => setQr({ ...qr, text: e.target.value })}
              placeholder="Texto que entra no campo de resposta"
            />
            <Btn
              type="submit"
              variant="outline"
              disabled={qr.shortcut.length < 2 || !qr.text.trim()}
            >
              Adicionar
            </Btn>
          </form>
        )}
      </Panel>

      <Panel
        title="Dados de demonstração"
        description="Os dados ficam neste navegador. Restaurar apaga o que foi criado e volta ao cenário inicial em todas as organizações."
      >
        <ConfirmAction
          title="Restaurar dados de demonstração?"
          description="Tudo o que foi criado ou alterado neste navegador será apagado, e você volta para a tela de entrada."
          confirmLabel="Restaurar dados"
          onConfirm={() => {
            resetDemo();
            navigate({ to: "/crm/entrar" });
          }}
          trigger={
            <Btn variant="outline">
              <RotateCcw className="h-4 w-4" />
              Restaurar dados de demonstração
            </Btn>
          }
        />
      </Panel>
    </div>
  );
}
