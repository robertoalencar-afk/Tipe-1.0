/**
 * Painel do restaurante › Integrações (03/11): o catálogo com o passo a passo de cada
 * sistema e, no fim, o formulário para enviar a chave, o código, o certificado ou o arquivo.
 * Abaixo, os pedidos enviados e o status de cada um (a equipe Tipe confere e liga).
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CatalogoIntegracoes,
  MarcaSistema,
} from "@/components/tipe/site/integracoes/CatalogoIntegracoes";
import {
  METODOS,
  SISTEMAS,
  type MetodoId,
  type Sistema,
} from "@/components/tipe/site/integracoes/catalogo";
import {
  listIntegrationRequests,
  sendIntegrationRequest,
  setIntegrationRequestStatus,
} from "@/lib/tipe/integration-requests.functions";

const STATUS: Record<string, { t: string; cls: string }> = {
  recebido: { t: "Recebido", cls: "bg-muted text-foreground" },
  em_ativacao: { t: "Em ativação", cls: "bg-[#ffd27a]/40 text-[#5a4300]" },
  ativo: { t: "Ativo", cls: "bg-[#0FC9BD]/20 text-[#08766f]" },
  precisa_ajuste: { t: "Precisa de ajuste", cls: "bg-destructive/15 text-destructive" },
};

type Campo = { k: string; rotulo: string; segredo?: boolean; dica?: string };
const CAMPOS: Partial<Record<MetodoId, Campo[]>> = {
  api: [
    { k: "token", rotulo: "Token ou chave de API", segredo: true },
    { k: "conta", rotulo: "ID da loja ou da conta (se o sistema pedir)" },
  ],
  autorizacao: [
    { k: "codigo", rotulo: "Código de vínculo", segredo: true },
    { k: "loja", rotulo: "ID da loja no app" },
  ],
  certificado: [
    { k: "senha_certificado", rotulo: "Senha do certificado A1", segredo: true },
    { k: "csc", rotulo: "CSC (código da SEFAZ)", segredo: true },
    { k: "csc_id", rotulo: "ID do CSC" },
    { k: "token", rotulo: "Token do emissor", segredo: true },
  ],
};

const ACEITA: Partial<Record<MetodoId, string>> = {
  arquivo: ".csv,.xlsx,.xls,.xml,.json,.txt,.pdf,.jpg,.jpeg,.png,.webp",
  certificado: ".pfx,.p12",
};

function lerBase64(f: File) {
  return new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => erro(new Error("Não foi possível ler o arquivo"));
    r.readAsDataURL(f);
  });
}

function Formulario({
  slug,
  sis,
  metodo,
  enviado,
}: {
  slug: string;
  sis: Sistema;
  metodo: MetodoId;
  enviado: () => void;
}) {
  const enviar = useServerFn(sendIntegrationRequest);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  if (sis.nativo && sis.id === "pagarme")
    return (
      <p className="text-sm text-muted-foreground">
        O Pagar.me já é a integração de pagamentos da Tipe. A chave é cadastrada em Recebimentos.
      </p>
    );

  const campos = CAMPOS[metodo] ?? [];
  const aceita = ACEITA[metodo];

  async function mandar() {
    if (arquivo && arquivo.size > 3_000_000) {
      toast.error("Arquivo acima de 3 MB. Envie em partes ou fale com a equipe.");
      return;
    }
    setBusy(true);
    try {
      await enviar({
        data: {
          slug,
          systemId: sis.id,
          category: sis.cat,
          method: metodo,
          credentials: campos.length ? valores : undefined,
          file: arquivo
            ? { name: arquivo.name, type: arquivo.type, b64: await lerBase64(arquivo) }
            : undefined,
          notes: obs || undefined,
        },
      });
      toast.success(`Recebido. A equipe Tipe vai ligar ${sis.nome} e te avisa aqui.`);
      setValores({});
      setArquivo(null);
      setObs("");
      enviado();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Enviar para a Tipe · {METODOS[metodo].titulo}</p>
      {campos.map((c) => (
        <label key={c.k} className="block">
          <span className="text-xs text-muted-foreground">{c.rotulo}</span>
          <input
            type={c.segredo ? "password" : "text"}
            autoComplete="off"
            value={valores[c.k] ?? ""}
            onChange={(e) => setValores((v) => ({ ...v, [c.k]: e.target.value }))}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-foreground"
          />
        </label>
      ))}
      {aceita && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm hover:border-foreground/40">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {arquivo
              ? arquivo.name
              : metodo === "certificado"
                ? "Escolher o certificado (.pfx)"
                : "Escolher o arquivo"}
          </span>
          <input
            type="file"
            accept={aceita}
            className="sr-only"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {metodo === "webhook" && (
        <p className="text-sm text-muted-foreground">
          Ao enviar, a equipe Tipe gera o endereço e o segredo da API TIPE para o seu sistema.
        </p>
      )}
      <label className="block">
        <span className="text-xs text-muted-foreground">Observação (opcional)</span>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          maxLength={1000}
          rows={2}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
        />
      </label>
      <Button disabled={busy} onClick={mandar} className="h-11 w-full rounded-full">
        {busy ? "Enviando…" : `Enviar e conectar ${sis.nome}`}
      </Button>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Chaves, senhas e arquivos são guardados criptografados.
      </p>
    </div>
  );
}

export function ConectarSistemas({ slug }: { slug: string }) {
  const listar = useServerFn(listIntegrationRequests);
  const mudar = useServerFn(setIntegrationRequestStatus);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["integ-pedidos", slug],
    queryFn: () => listar({ data: { slug } }),
  });
  const atualizar = () => qc.invalidateQueries({ queryKey: ["integ-pedidos", slug] });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display font-semibold">Conectar o seu sistema</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o sistema, siga o passo a passo e envie a chave ou o arquivo. Enquanto a equipe
          liga, os pedidos seguem pelo Lançamento TIPE.
        </p>
      </div>
      <CatalogoIntegracoes
        acao={(sis, metodo) => (
          <Formulario slug={slug} sis={sis} metodo={metodo} enviado={atualizar} />
        )}
      />
      {!!q.data?.pedidos.length && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Enviados</h4>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {q.data.pedidos.map((p) => {
              const sis = SISTEMAS.find((x) => x.id === p.system_id);
              const st = STATUS[p.status] ?? STATUS["recebido"]!;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  {sis && <MarcaSistema sis={sis} />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{sis?.nome ?? p.system_id}</span>
                    <span className="block text-xs text-muted-foreground">
                      {METODOS[p.method as MetodoId]?.titulo ?? p.method}
                      {p.file_name ? ` · ${p.file_name}` : ""} ·{" "}
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      {p.status_note ? ` · ${p.status_note}` : ""}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                    {st.t}
                  </span>
                  {q.data.isFounder && (
                    <select
                      aria-label="Status"
                      value={p.status}
                      onChange={async (e) => {
                        try {
                          await mudar({ data: { id: p.id, status: e.target.value as never } });
                          atualizar();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                      className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                    >
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.t}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
