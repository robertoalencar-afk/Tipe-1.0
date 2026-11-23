import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Aviso,
  Busca,
  Campo,
  Esqueleto,
  Kpi,
  Painel,
  PainelLateral,
  Segmentado,
  StatusBadge,
  Tabela,
  dataBR,
  horaBR,
  inputCls,
  relativo,
  usePaginacao,
  type Tone,
} from "@/components/tipe/painel/ui";
import { useMeuPerfil } from "@/components/tipe/PerfilConta";
import {
  converterProspect,
  descartarProspect,
  getProspeccao,
  getProspect,
  reabrirProspect,
  registrarToque,
} from "@/lib/tipe/prospeccao.functions";
import {
  CADENCIA,
  CANAIS,
  CATEGORIAS,
  RESULTADOS,
  STATUS_PROSPECT,
  canalDoPasso,
  faixa,
  filaDoDia,
  foneLegivel,
  linkWhatsapp,
  mensagem,
  poloDe,
  type Resultado,
  type StatusProspect,
} from "@/lib/tipe/prospeccao";

const VISTAS = [
  ["fila", "Fila de hoje"],
  ["cadencia", "Em cadência"],
  ["todos", "Todos"],
  ["encerrados", "Encerrados"],
] as const;
type Vista = (typeof VISTAS)[number][0];
const FAIXA_TONE: Record<string, Tone> = { A: "success", B: "brand", C: "neutral" };
const STATUS_TONE: Record<StatusProspect, Tone> = {
  novo: "neutral",
  em_contato: "brand",
  respondeu: "warning",
  convertido: "success",
  descartado: "neutral",
  opt_out: "error",
};

type Dados = Awaited<ReturnType<typeof getProspeccao>>;

export function Prospeccao({
  id,
  abrir,
  fechar,
  abrirLead,
}: {
  id?: string | undefined;
  abrir: (id: string) => void;
  fechar: () => void;
  abrirLead: (leadId: string) => void;
}) {
  const fetchLista = useServerFn(getProspeccao);
  const q = useQuery({
    queryKey: ["central-prospeccao"],
    queryFn: () => fetchLista(),
    refetchInterval: 120_000,
  });
  const [vista, setVista] = useState<Vista>("fila");
  const [busca, setBusca] = useState("");
  const [fx, setFx] = useState<"todas" | "A" | "B" | "C">("todas");
  const [cat, setCat] = useState<string>("todas");
  const [soWhats, setSoWhats] = useState(false);
  const agora = new Date();
  const lista = q.data?.prospects ?? [];
  const linhas = useMemo(() => {
    const base =
      vista === "fila"
        ? filaDoDia(lista, agora)
        : lista.filter(
            (p: any) =>
              vista === "todos" ||
              (vista === "cadencia"
                ? ["em_contato", "respondeu"].includes(p.status)
                : ["descartado", "opt_out", "convertido"].includes(p.status)),
          );
    const t = busca.trim().toLowerCase();
    return base.filter(
      (p: any) =>
        (fx === "todas" || faixa(p.score) === fx) &&
        (cat === "todas" || p.category === cat) &&
        (!soWhats || p.whatsapp) &&
        (!t ||
          [p.name, p.neighborhood, p.street, p.cuisine, p.instagram, p.phone].some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(t),
          )),
    );
  }, [lista, vista, busca, fx, cat, soWhats]); // eslint-disable-line react-hooks/exhaustive-deps
  const pag = usePaginacao(linhas, 25);
  if (q.isPending) return <Esqueleto linhas={6} />;
  if (q.isError)
    return (
      <Aviso tone="warning">Não deu para carregar a prospecção: {(q.error as Error).message}</Aviso>
    );
  const d = q.data as Dados;
  const ultima = d.coletas[0];
  const conta = (s: StatusProspect) => lista.filter((p: any) => p.status === s).length;
  const fila = filaDoDia(lista, agora);

  if (lista.length === 0) {
    return (
      <Painel
        titulo="Prospecção ativa"
        descricao="Restaurantes mapeados em dados públicos, com score e cadência de abordagem."
      >
        <div className="space-y-3 text-sm">
          <p>
            A base ainda está vazia. A coleta roda no GitHub Actions (workflow{" "}
            <b>Prospecção de restaurantes</b>): escolha a cidade e a UF e marque gravar no banco.
            Toda segunda às 6h ela atualiza Fortaleza sozinha.
          </p>
          {ultima && (
            <Aviso tone={ultima.status === "failed" ? "warning" : "neutral"}>
              Última coleta: {ultima.city}/{ultima.state} em {horaBR(ultima.created_at)} ·{" "}
              {ultima.status === "failed"
                ? `falhou: ${ultima.detail}`
                : `${ultima.found} encontrados`}
            </Aviso>
          )}
        </div>
      </Painel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Mapeados"
          value={lista.length}
          hint={ultima ? `${ultima.city} · ${relativo(ultima.created_at)}` : undefined}
        />
        <Kpi
          label="Faixa A"
          value={lista.filter((p: any) => faixa(p.score) === "A" && p.status === "novo").length}
          hint="novos com maior chance"
          tone="brand"
          onClick={() => {
            setVista("todos");
            setFx("A");
          }}
        />
        <Kpi label="Fila de hoje" value={fila.length} onClick={() => setVista("fila")} />
        <Kpi label="Em cadência" value={conta("em_contato")} onClick={() => setVista("cadencia")} />
        <Kpi
          label="Responderam"
          value={conta("respondeu")}
          tone={conta("respondeu") ? "warning" : undefined}
          onClick={() => setVista("cadencia")}
        />
        <Kpi
          label="Viraram lead"
          value={conta("convertido")}
          onClick={() => setVista("encerrados")}
        />
      </div>

      <Painel
        titulo="Prospecção ativa"
        descricao={
          vista === "fila"
            ? "Quem respondeu, os toques vencidos da cadência e os 20 melhores novos do dia."
            : `${linhas.length} restaurantes neste filtro`
        }
        semPadding
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Segmentado
              label="Vista"
              value={vista}
              onChange={(v) => {
                setVista(v);
                pag.reset();
              }}
              options={VISTAS}
            />
            <select
              className={`${inputCls} h-9 w-auto text-sm`}
              value={fx}
              onChange={(e) => {
                setFx(e.target.value as typeof fx);
                pag.reset();
              }}
              aria-label="Faixa de score"
            >
              <option value="todas">Todas as faixas</option>
              <option value="A">Faixa A</option>
              <option value="B">Faixa B</option>
              <option value="C">Faixa C</option>
            </select>
            <select
              className={`${inputCls} h-9 w-auto text-sm`}
              value={cat}
              onChange={(e) => {
                setCat(e.target.value);
                pag.reset();
              }}
              aria-label="Tipo"
            >
              <option value="todas">Todos os tipos</option>
              {Object.entries(CATEGORIAS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={soWhats}
                onChange={(e) => {
                  setSoWhats(e.target.checked);
                  pag.reset();
                }}
              />{" "}
              Com WhatsApp
            </label>
            <Busca
              value={busca}
              onChange={(v) => {
                setBusca(v);
                pag.reset();
              }}
              placeholder="Nome, bairro, cozinha…"
            />
          </div>
        }
      >
        <Tabela
          linhas={pag.fatia}
          chave={(p: any) => p.id}
          onLinha={(p: any) => abrir(p.id)}
          rodape={pag.controles}
          vazio={
            vista === "fila"
              ? "Fila de hoje zerada. Bom trabalho!"
              : "Nenhum restaurante com esse filtro."
          }
          colunas={[
            {
              k: "n",
              l: "Restaurante",
              c: (p: any) => (
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {CATEGORIAS[p.category as keyof typeof CATEGORIAS]}
                    {p.cuisine ? ` · ${p.cuisine.replace(/;/g, ", ")}` : ""}
                  </span>
                </span>
              ),
            },
            {
              k: "b",
              l: "Onde",
              md: true,
              c: (p: any) => (
                <span className="text-sm">{poloDe(p) ?? p.neighborhood ?? p.street ?? "—"}</span>
              ),
            },
            {
              k: "c",
              l: "Contato",
              md: true,
              c: (p: any) => (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {p.whatsapp && (
                    <MessageCircle className="size-4 text-success" aria-label="WhatsApp" />
                  )}
                  {!p.whatsapp && p.phone && <Phone className="size-4" aria-label="Telefone" />}
                  {p.instagram && <Instagram className="size-4" aria-label="Instagram" />}
                  {!p.phone && !p.instagram && !p.email && "—"}
                </span>
              ),
            },
            {
              k: "s",
              l: "Score",
              num: true,
              c: (p: any) => (
                <StatusBadge tone={FAIXA_TONE[faixa(p.score)] ?? "neutral"}>
                  {faixa(p.score)} · {p.score}
                </StatusBadge>
              ),
            },
            {
              k: "st",
              l: "Situação",
              c: (p: any) => (
                <StatusBadge tone={STATUS_TONE[p.status as StatusProspect]}>
                  {STATUS_PROSPECT[p.status as StatusProspect]}
                </StatusBadge>
              ),
            },
            { k: "p", l: "Próximo passo", md: true, c: (p: any) => proximoTexto(p) },
          ]}
        />
      </Painel>
      <p className="text-xs text-muted-foreground">
        Dados públicos de empresa © colaboradores do OpenStreetMap (ODbL). Contato B2B por legítimo
        interesse: toda mensagem oferece a saída e quem pede para sair não volta em nenhuma coleta.
      </p>
      {id && <FichaProspect id={id} onFechar={fechar} abrirLead={abrirLead} />}
    </div>
  );
}

function proximoTexto(p: any) {
  if (p.status === "novo") return "Toque 1 · hoje";
  if (p.status === "em_contato" || p.status === "respondeu") {
    const passo = p.status === "respondeu" ? "Responder" : `Toque ${p.cadence_step + 1}`;
    return `${passo} · ${p.next_touch_at ? dataBR(p.next_touch_at) : "hoje"}`;
  }
  return p.discard_reason ?? STATUS_PROSPECT[p.status as StatusProspect];
}

function FichaProspect({
  id,
  onFechar,
  abrirLead,
}: {
  id: string;
  onFechar: () => void;
  abrirLead: (leadId: string) => void;
}) {
  const qc = useQueryClient();
  const fetchUm = useServerFn(getProspect);
  const q = useQuery({
    queryKey: ["central-prospect", id],
    queryFn: () => fetchUm({ data: { id } }),
  });
  const meu = useMeuPerfil();
  const toque = useServerFn(registrarToque);
  const descartar = useServerFn(descartarProspect);
  const reabrir = useServerFn(reabrirProspect);
  const converter = useServerFn(converterProspect);
  const [nota, setNota] = useState("");
  const [texto, setTexto] = useState<string | null>(null);
  const [conv, setConv] = useState<{
    contato: string;
    cargo: "dono" | "gerente" | "outro";
    email: string;
    telefone: string;
  } | null>(null);
  const inv = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["central-prospeccao"] }),
      qc.invalidateQueries({ queryKey: ["central-prospect", id] }),
      qc.invalidateQueries({ queryKey: ["central-crm"] }),
    ]);
  const erro = (e: Error) => toast.error(e.message);
  const mToque = useMutation({
    mutationFn: (resultado: Resultado) =>
      toque({ data: { id, resultado, nota: nota || undefined } }),
    onSuccess: (r) => {
      setNota("");
      setTexto(null);
      toast.success(
        r.next_touch_at ? `Registrado. Próximo toque em ${dataBR(r.next_touch_at)}` : "Registrado",
      );
      inv();
    },
    onError: erro,
  });
  const mDesc = useMutation({
    mutationFn: (v: { motivo: string; naoContatar: boolean }) => descartar({ data: { id, ...v } }),
    onSuccess: () => {
      toast.success("Atualizado");
      inv();
    },
    onError: erro,
  });
  const mReab = useMutation({
    mutationFn: () => reabrir({ data: { id } }),
    onSuccess: () => {
      toast.success("Reaberto");
      inv();
    },
    onError: erro,
  });
  const mConv = useMutation({
    mutationFn: () =>
      converter({
        data: {
          id,
          contato: conv!.contato,
          cargo: conv!.cargo,
          email: conv!.email,
          telefone: conv!.telefone || undefined,
          nota: nota || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success("Virou lead: oportunidade e tarefa criadas no funil");
      inv();
      abrirLead(r.leadId);
    },
    onError: erro,
  });

  const f = q.data;
  const p = f?.prospect as any;
  const ativo = p && !["convertido", "opt_out", "descartado"].includes(p.status);
  const passo = p
    ? Math.min(5, p.status === "respondeu" ? Math.max(1, p.cadence_step) : p.cadence_step + 1)
    : 1;
  const canal = p ? canalDoPasso(passo, p) : "whatsapp";
  const plano = CADENCIA.find((c) => c.passo === passo)!;
  const rascunho = texto ?? (p ? mensagem(passo, p, meu.data?.nome || "Roberto") : "");
  const endereco = p
    ? [
        p.street && `${p.street}${p.number ? `, ${p.number}` : ""}`,
        p.neighborhood,
        `${p.city}/${p.state}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <PainelLateral
      aberto
      onFechar={onFechar}
      largo
      titulo={p?.name ?? "Restaurante"}
      descricao={
        p
          ? `${CATEGORIAS[p.category as keyof typeof CATEGORIAS]}${p.cuisine ? ` · ${p.cuisine.replace(/;/g, ", ")}` : ""} · mapeado em ${dataBR(p.first_seen_at)}`
          : undefined
      }
    >
      {!p ? (
        <Esqueleto linhas={8} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={FAIXA_TONE[faixa(p.score)] ?? "neutral"}>
              Faixa {faixa(p.score)} · {p.score}
            </StatusBadge>
            <StatusBadge tone={STATUS_TONE[p.status as StatusProspect]}>
              {STATUS_PROSPECT[p.status as StatusProspect]}
            </StatusBadge>
            {p.brand && <StatusBadge tone="neutral">Rede: {p.brand}</StatusBadge>}
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            {(
              [
                ["Endereço", endereco],
                ["Telefone", foneLegivel(p.phone)],
                ["WhatsApp", foneLegivel(p.whatsapp)],
                ["Instagram", p.instagram && `@${p.instagram}`],
                ["Site", p.website],
                ["E-mail", p.email],
                ["Horário", p.opening_hours],
              ] as [string, string | null][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="break-words font-medium">{v}</dd>
                </div>
              ))}
          </dl>

          <div className="flex flex-wrap gap-2">
            {p.lat != null && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.city}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="size-4" /> Ver no mapa
                </a>
              </Button>
            )}
            {p.instagram && (
              <Button asChild variant="outline" size="sm">
                <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer">
                  <Instagram className="size-4" /> Instagram
                </a>
              </Button>
            )}
            {p.website && (
              <Button asChild variant="outline" size="sm">
                <a href={p.website} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> Site
                </a>
              </Button>
            )}
            {p.source === "osm" && (
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`https://www.openstreetmap.org/${p.source_ref}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fonte (OSM)
                </a>
              </Button>
            )}
          </div>

          <section>
            <h3 className="mb-1 text-sm font-semibold">Por que este score</h3>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {(p.score_reasons ?? []).map((r: string) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          {ativo && (
            <section className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div>
                <h3 className="text-sm font-semibold">
                  {p.status === "respondeu"
                    ? "Respondeu: dar sequência"
                    : `Toque ${passo} de 5 · ${CANAIS[canal]}`}
                </h3>
                <p className="text-xs text-muted-foreground">{plano.objetivo}</p>
              </div>
              <Campo label="Mensagem (revise antes de enviar)">
                <textarea
                  className={`${inputCls} min-h-32 py-2 text-sm`}
                  value={rascunho}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={1200}
                />
              </Campo>
              <div className="flex flex-wrap gap-2">
                {(p.whatsapp || (canal === "whatsapp" && p.phone)) && (
                  <Button asChild size="sm" variant="ink">
                    <a
                      href={linkWhatsapp(p.whatsapp ?? p.phone, rascunho)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-4" /> Abrir no WhatsApp
                    </a>
                  </Button>
                )}
                {p.phone && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:+${p.phone}`}>
                      <Phone className="size-4" /> Ligar
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(rascunho)
                      .then(() => toast.success("Mensagem copiada"));
                  }}
                >
                  <Copy className="size-4" /> Copiar
                </Button>
              </div>
              <Campo label="Nota do toque (opcional)">
                <input
                  className={`${inputCls} h-9`}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  maxLength={1000}
                  placeholder="Ex.: falei com a gerente, pediu retorno sexta"
                />
              </Campo>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Depois de enviar ou ligar, registre o resultado:
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(RESULTADOS) as Resultado[]).map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={
                        r === "interessado" ? "ink" : r === "opt_out" ? "destructive" : "outline"
                      }
                      disabled={mToque.isPending}
                      onClick={() =>
                        r === "interessado"
                          ? setConv({
                              contato: "",
                              cargo: "dono",
                              email: p.email ?? "",
                              telefone: "",
                            })
                          : mToque.mutate(r)
                      }
                    >
                      {RESULTADOS[r]}
                    </Button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {conv && ativo && (
            <form
              className="space-y-3 rounded-xl border border-border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                mConv.mutate();
              }}
            >
              <h3 className="text-sm font-semibold">Virar lead no funil</h3>
              <p className="text-xs text-muted-foreground">
                Com um contato de verdade, o restaurante entra no funil (Novo lead) com oportunidade
                e tarefa de amanhã.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Nome do contato">
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    className={`${inputCls} h-9`}
                    value={conv.contato}
                    onChange={(e) => setConv({ ...conv, contato: e.target.value })}
                  />
                </Campo>
                <Campo label="Cargo">
                  <select
                    className={`${inputCls} h-9`}
                    value={conv.cargo}
                    onChange={(e) =>
                      setConv({ ...conv, cargo: e.target.value as typeof conv.cargo })
                    }
                  >
                    <option value="dono">Proprietário</option>
                    <option value="gerente">Gerente</option>
                    <option value="outro">Outro</option>
                  </select>
                </Campo>
                <Campo label="E-mail">
                  <input
                    required
                    type="email"
                    maxLength={120}
                    className={`${inputCls} h-9`}
                    value={conv.email}
                    onChange={(e) => setConv({ ...conv, email: e.target.value })}
                  />
                </Campo>
                <Campo label="Telefone do contato" ajuda="Vazio usa o do restaurante">
                  <input
                    maxLength={30}
                    className={`${inputCls} h-9`}
                    value={conv.telefone}
                    onChange={(e) => setConv({ ...conv, telefone: e.target.value })}
                  />
                </Campo>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="ink" disabled={mConv.isPending}>
                  <UserPlus className="size-4" /> Criar lead
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConv(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {p.status === "convertido" && p.lead_id && (
            <Aviso
              acao={
                <Button size="sm" variant="outline" onClick={() => abrirLead(p.lead_id)}>
                  Abrir lead
                </Button>
              }
            >
              Já é lead no funil.
            </Aviso>
          )}
          {p.status === "opt_out" && (
            <Aviso tone="warning">
              Pediu para não receber contato. Fica fora de todas as coletas e cadências.
            </Aviso>
          )}
          {p.status === "descartado" && (
            <Aviso
              acao={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mReab.isPending}
                  onClick={() => mReab.mutate()}
                >
                  Reabrir
                </Button>
              }
            >
              Descartado: {p.discard_reason ?? "sem motivo"}.
            </Aviso>
          )}

          {ativo && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  mDesc.mutate({ motivo: "Não é público da Tipe", naoContatar: false })
                }
              >
                Descartar: não é público
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  mDesc.mutate({ motivo: "Fechado ou não existe mais", naoContatar: false })
                }
              >
                Fechou
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() =>
                  mDesc.mutate({ motivo: "Pediu para não receber", naoContatar: true })
                }
              >
                Não contatar mais
              </Button>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Histórico de toques</h3>
            <ol className="space-y-3 border-l border-border pl-4 text-sm">
              {f!.toques.map((t: any) => (
                <li key={t.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" />
                  <p className="font-medium">
                    Toque {t.step} · {CANAIS[t.channel as keyof typeof CANAIS]} ·{" "}
                    {RESULTADOS[t.outcome as Resultado]}
                  </p>
                  {t.note && <p className="text-muted-foreground">{t.note}</p>}
                  <p className="text-xs text-muted-foreground">{horaBR(t.created_at)}</p>
                </li>
              ))}
              {f!.toques.length === 0 && (
                <li className="text-muted-foreground">Nenhum toque ainda.</li>
              )}
            </ol>
          </section>
        </div>
      )}
    </PainelLateral>
  );
}
