import { Carregando } from "@/components/tipe/Carregando";
import { FiscalEmitir } from "./FiscalEmitir";
import { FiscalHabilitacao } from "./FiscalHabilitacao";
import { FiscalDocumentoAcoes } from "./FiscalDocumentoAcoes";
import { FiscalImpressao } from "./FiscalImpressao";
import { FiscalAtivacao } from "./FiscalAtivacao";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FUSOS_FISCAIS_BR, UFS_FISCAIS, type AmbienteFiscal } from "@/lib/tipe/fiscal/contract";
import {
  ConfiguracaoFiscal,
  PerfilProdutoFiscal,
  type DadosConfiguracaoFiscal,
} from "@/lib/tipe/fiscal/schemas";
import {
  closeFiscalProductProfile,
  getFiscalDocuments,
  getFiscalProducts,
  getFiscalSetup,
  saveFiscalProductProfile,
  saveFiscalSetup,
} from "@/lib/tipe/fiscal.functions";

const selectClass = "mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
const brl = (cents: unknown) =>
  (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: unknown, timeZone = "America/Sao_Paulo") =>
  typeof value === "string" ? new Date(value).toLocaleString("pt-BR", { timeZone }) : "—";
const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
const stateLabel: Record<string, string> = {
  draft: "Rascunho",
  queued: "Na fila",
  processing: "Em processamento",
  uncertain: "Aguardando consulta ao emissor",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  denied: "Denegada",
  cancelled: "Cancelada",
  voided: "Descartada antes do envio",
};

export function Fiscal({ slug, canConfigure = true }: { slug: string; canConfigure?: boolean }) {
  const [environment, setEnvironment] = useState<AmbienteFiscal>("homologacao");
  const [aba, setAba] = useState(canConfigure ? "ativacao" : "emissao");
  const [documentId, setDocumentId] = useState<string | undefined>(undefined);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Fiscal do restaurante</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Dados do emitente, perfis tributários revisados e documentos, separados por ambiente.
          </p>
        </div>
        <label className="text-sm font-medium">
          Ambiente
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as AmbienteFiscal)}
            className={selectClass}
          >
            <option value="homologacao">Homologação · testes sem valor fiscal</option>
            <option value="producao">Produção · documentos com valor fiscal</option>
          </select>
        </label>
      </div>
      <nav
        aria-label="Seções fiscais"
        className="flex gap-2 overflow-x-auto border-b border-border pb-3"
      >
        {[
          ["ativacao", "Ativar NFC-e"],
          ["configuracao", "Emitente e conexão"],
          ["produtos", "Tributos dos produtos"],
          ["emissao", "Emitir NFC-e"],
          ["documentos", "Documentos"],
          ["impressao", "Impressora"],
        ]
          .filter(
            ([key]) => canConfigure || !["ativacao", "configuracao", "produtos"].includes(key!),
          )
          .map(([key, label]) => (
            <Button
              key={key}
              variant={aba === key ? "default" : "ghost"}
              aria-current={aba === key ? "page" : undefined}
              onClick={() => {
                setAba(key!);
                if (key === "documentos") setDocumentId(undefined);
              }}
            >
              {label}
            </Button>
          ))}
      </nav>
      <div key={environment}>
        {aba === "ativacao" && canConfigure ? (
          <FiscalAtivacao
            slug={slug}
            onIr={(destino, ambiente) => {
              if (ambiente) setEnvironment(ambiente);
              setAba(destino);
            }}
          />
        ) : aba === "configuracao" && canConfigure ? (
          <Configuracao slug={slug} environment={environment} />
        ) : aba === "produtos" && canConfigure ? (
          <Produtos slug={slug} environment={environment} />
        ) : aba === "emissao" ? (
          <FiscalEmitir
            slug={slug}
            environment={environment}
            onDocument={(id) => {
              setDocumentId(id);
              setAba("documentos");
            }}
          />
        ) : aba === "impressao" ? (
          <FiscalImpressao slug={slug} />
        ) : (
          <Documentos
            slug={slug}
            environment={environment}
            documentId={documentId}
            canConfigure={canConfigure}
            onShowAll={() => setDocumentId(undefined)}
          />
        )}
      </div>
    </div>
  );
}

function Campo({
  label,
  name,
  value = "",
  required = true,
  ...rest
}: { label: string; name: string; value?: string | undefined; required?: boolean } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "name"
>) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input name={name} defaultValue={value} required={required} className="mt-1 h-11" {...rest} />
    </label>
  );
}

function Configuracao({ slug, environment }: { slug: string; environment: AmbienteFiscal }) {
  const fetch = useServerFn(getFiscalSetup);
  const save = useServerFn(saveFiscalSetup);
  const qc = useQueryClient();
  const [erro, setErro] = useState("");
  const q = useQuery({
    queryKey: ["fiscal-setup", slug, environment],
    queryFn: () => fetch({ data: { slug, environment } }),
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationFn: (configuration: DadosConfiguracaoFiscal) => save({ data: { slug, configuration } }),
    onSuccess: async () => {
      toast.success("Configuração salva. Emissão permanece desabilitada até a validação.");
      await qc.invalidateQueries({ queryKey: ["fiscal-setup", slug, environment] });
    },
    onError: (e) => setErro(e.message),
  });
  if (q.isPending) return <Carregando tamanho="sm" texto="Carregando dados fiscais" />;
  if (q.isError) return <Falha mensagem={q.error.message} retry={() => void q.refetch()} />;
  const settings = q.data.settings;
  const address = settings?.address as DadosConfiguracaoFiscal["address"] | undefined;
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    const f = new FormData(event.currentTarget);
    const get = (k: string) => text(f.get(k));
    const parsed = ConfiguracaoFiscal.safeParse({
      provider: "focus",
      environment,
      cnpj: q.data?.registeredCnpj ?? "",
      legalName: get("legalName"),
      stateRegistration: get("stateRegistration"),
      uf: get("uf"),
      timeZone: get("timeZone"),
      acquirerCnpj: get("acquirerCnpj") || null,
      serviceFeePolicy: get("serviceFeePolicy"),
      serviceFeeReview: get("serviceFeeReview") || null,
      municipalityCode: get("municipalityCode"),
      taxRegime: get("taxRegime"),
      address: {
        street: get("street"),
        number: get("number"),
        district: get("district"),
        city: get("city"),
        postalCode: get("postalCode"),
        complement: get("complement"),
      },
      ...(get("token") ? { token: get("token") } : {}),
    });
    if (!parsed.success) {
      setErro(
        "Confira os dados fiscais, o CNPJ, o CEP e o código IBGE do município antes de salvar.",
      );
      return;
    }
    mutation.mutate(parsed.data);
  }
  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Dados do emitente</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            CNPJ cadastrado:{" "}
            <strong className="text-foreground">{q.data.registeredCnpj || "Não informado"}</strong>
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {settings?.enabled === true ? "Emissão habilitada" : "Emissão desabilitada"}
        </span>
      </div>
      {!q.data.registeredCnpj && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          O restaurante precisa ter um CNPJ cadastrado para configurar o emitente.
        </p>
      )}
      <form onSubmit={(e) => void salvar(e)} key={`${environment}-${text(settings?.updated_at)}`}>
        <fieldset disabled={mutation.isPending || !q.data.registeredCnpj} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Razão social"
              name="legalName"
              value={text(settings?.legal_name)}
              maxLength={160}
            />
            <Campo
              label="Inscrição estadual"
              name="stateRegistration"
              value={text(settings?.state_registration)}
              maxLength={24}
            />
            <label className="text-sm font-medium">
              Regime tributário
              <select
                name="taxRegime"
                defaultValue={text(settings?.tax_regime) || ""}
                required
                className={selectClass}
              >
                <option value="" disabled>
                  Selecione conforme a contabilidade
                </option>
                <option value="1">Simples Nacional</option>
                <option value="2">Simples Nacional · excesso de sublimite</option>
                <option value="3">Regime normal</option>
                <option value="4">MEI</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              UF
              <select
                name="uf"
                defaultValue={text(settings?.uf) || ""}
                required
                className={selectClass}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {UFS_FISCAIS.map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Fuso horário do estabelecimento
              <select
                name="timeZone"
                required
                defaultValue={text(settings?.time_zone) || ""}
                className={selectClass}
              >
                <option value="" disabled>
                  Selecione o horário local
                </option>
                {FUSOS_FISCAIS_BR.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace("America/", "").replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <Campo
              label="CNPJ da credenciadora · conforme o contrato"
              name="acquirerCnpj"
              value={text(settings?.acquirer_cnpj)}
              required={false}
              maxLength={24}
            />
            <label className="text-sm font-medium">
              Taxa de serviço · tratamento revisado
              <select
                name="serviceFeePolicy"
                defaultValue={text(settings?.service_fee_policy) || "blocked"}
                required
                className={selectClass}
              >
                <option value="blocked">Exigir revisão antes de emitir com taxa</option>
                <option value="allocate_expenses">
                  Ratear como despesa acessória dos produtos
                </option>
              </select>
            </label>
            <Campo
              label="Referência da revisão contábil da taxa · se aplicável"
              name="serviceFeeReview"
              value={text(settings?.service_fee_review)}
              required={false}
              maxLength={200}
            />
            <Campo label="Município" name="city" value={address?.city} maxLength={80} />
            <Campo
              label="Código IBGE do município · 7 dígitos"
              name="municipalityCode"
              value={text(settings?.municipality_code)}
              inputMode="numeric"
              pattern="[0-9]{7}"
            />
            <Campo label="Logradouro" name="street" value={address?.street} maxLength={120} />
            <Campo label="Número" name="number" value={address?.number} maxLength={20} />
            <Campo label="Bairro" name="district" value={address?.district} maxLength={80} />
            <Campo
              label="CEP · 8 dígitos"
              name="postalCode"
              value={address?.postalCode}
              inputMode="numeric"
              pattern="[0-9]{8}"
            />
            <Campo
              label="Complemento"
              name="complement"
              value={address?.complement}
              required={false}
              maxLength={80}
            />
          </div>
          <div className="border-t border-border pt-5">
            <h3 className="font-semibold">Conexão com o emissor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Focus NFe · NF-e e NFC-e. Use a credencial deste CNPJ e do ambiente selecionado.
            </p>
            <div className="mt-3 max-w-xl">
              <Campo
                label={`Token de ${environment === "producao" ? "produção" : "homologação"}`}
                name="token"
                type="password"
                autoComplete="new-password"
                required={!settings}
                maxLength={1000}
                placeholder={
                  settings
                    ? "Deixe vazio para manter a credencial salva"
                    : "Informe o token do emissor"
                }
              />
              <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-4 shrink-0" aria-hidden />A credencial é cifrada no
                servidor e não é exibida novamente. Alterações exigem nova validação antes de
                emitir.
              </p>
            </div>
          </div>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar configuração fiscal"}
          </Button>
        </fieldset>
      </form>
      {settings && (
        <FiscalHabilitacao
          slug={slug}
          environment={environment}
          enabled={settings.enabled === true}
        />
      )}
    </section>
  );
}

function Produtos({ slug, environment }: { slug: string; environment: AmbienteFiscal }) {
  const fetch = useServerFn(getFiscalProducts);
  const save = useServerFn(saveFiscalProductProfile);
  const close = useServerFn(closeFiscalProductProfile);
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const [erro, setErro] = useState("");
  const [until, setUntil] = useState("");
  const q = useQuery({
    queryKey: ["fiscal-products", slug, environment, offset],
    queryFn: () => fetch({ data: { slug, environment, offset } }),
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationFn: (profile: Parameters<typeof PerfilProdutoFiscal.parse>[0]) =>
      save({ data: { slug, environment, profile: PerfilProdutoFiscal.parse(profile) } }),
    onSuccess: async () => {
      toast.success("Perfil tributário registrado");
      await qc.invalidateQueries({ queryKey: ["fiscal-products", slug] });
    },
    onError: (e) => setErro(e.message),
  });
  const encerrar = useMutation({
    mutationFn: (id: string) =>
      close({ data: { slug, environment, profileId: id, validUntil: until } }),
    onSuccess: async () => {
      toast.success("Vigência encerrada");
      setUntil("");
      await qc.invalidateQueries({ queryKey: ["fiscal-products", slug] });
    },
    onError: (e) => setErro(e.message),
  });
  if (q.isPending) return <Carregando tamanho="sm" texto="Carregando produtos" />;
  if (q.isError) return <Falha mensagem={q.error.message} retry={() => void q.refetch()} />;
  const item = q.data.items.find((i) => i.id === selected) ?? q.data.items[0];
  const profiles = q.data.profiles.filter((p) => p.menu_item_id === item?.id);
  const latest = profiles[0];
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    if (!item) return;
    const f = new FormData(event.currentTarget);
    const get = (key: string) => text(f.get(key));
    try {
      const parsed = PerfilProdutoFiscal.safeParse({
        itemId: item.id,
        validFrom: get("validFrom"),
        validUntil: get("validUntil") || null,
        ncm: get("ncm"),
        cfop: get("cfop"),
        unit: get("unit"),
        layoutVersion: get("layoutVersion"),
        tablesVersion: get("tablesVersion"),
        reviewReference: get("reviewReference"),
        attributes: JSON.parse(get("attributes")),
        calculationRules: JSON.parse(get("calculationRules")),
      });
      if (!parsed.success) {
        setErro("Confira a vigência, NCM, CFOP, unidade, versões e dados tributários revisados.");
        return;
      }
      mutation.mutate(parsed.data);
    } catch {
      setErro("Os dados tributários precisam estar em JSON válido, conforme o emissor.");
    }
  }
  return (
    <section className="surface-card space-y-5 p-4 sm:p-6">
      <div>
        <h3 className="font-semibold">Tributos dos produtos</h3>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Registre os dados revisados pela contabilidade para a UF e o regime do emitente. Cada
          alteração cria uma nova vigência; perfis anteriores permanecem no histórico.
        </p>
      </div>
      <div className="flex justify-between gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={offset === 0}
          onClick={() => {
            setOffset(Math.max(0, offset - 50));
            setSelected("");
          }}
        >
          Anteriores
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={q.data.items.length < 50 || offset >= 100000}
          onClick={() => {
            setOffset(offset + 50);
            setSelected("");
          }}
        >
          Próximos produtos
        </Button>
      </div>
      {!item ? (
        <p className="text-sm text-muted-foreground">
          {offset > 0
            ? "Não há outros produtos nesta página. Use Anteriores para voltar."
            : "Cadastre produtos no cardápio para definir os perfis tributários."}
        </p>
      ) : (
        <>
          <label className="block text-sm font-medium">
            Produto
            <select
              value={item.id}
              className={selectClass}
              onChange={(e) => {
                setSelected(e.target.value);
                setErro("");
                setUntil("");
              }}
            >
              {q.data.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} · {i.name}
                </option>
              ))}
            </select>
          </label>
          {latest && (
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm font-semibold">
                Último perfil registrado · NCM {text(latest.ncm)} · CFOP {text(latest.cfop)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vigência: {text(latest.valid_from)} até{" "}
                {text(latest.valid_until) || "sem data de fim"} · revisão:{" "}
                {text(latest.review_reference)}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs font-medium">
                  Encerrar vigência em
                  <Input
                    type="date"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    min={text(latest.valid_from)}
                    max={text(latest.valid_until) || undefined}
                    className="mt-1"
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!until || encerrar.isPending}
                  onClick={() => encerrar.mutate(text(latest.id))}
                >
                  Encerrar esta vigência
                </Button>
              </div>
            </div>
          )}
          <form onSubmit={(e) => void salvar(e)} key={`${item.id}-${profiles.length}`}>
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <h4 className="font-semibold">Registrar novo perfil revisado</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo label="NCM · 8 dígitos" name="ncm" pattern="[0-9]{8}" inputMode="numeric" />
                <Campo
                  label="CFOP · 4 dígitos"
                  name="cfop"
                  pattern="[123567][0-9]{3}"
                  inputMode="numeric"
                />
                <Campo label="Unidade comercial" name="unit" maxLength={6} />
                <Campo label="Início da vigência" name="validFrom" type="date" />
                <Campo
                  label="Fim da vigência · opcional"
                  name="validUntil"
                  type="date"
                  required={false}
                />
                <Campo label="Versão do leiaute" name="layoutVersion" maxLength={40} />
                <Campo label="Versão das tabelas tributárias" name="tablesVersion" maxLength={80} />
                <Campo
                  label="Referência da revisão contábil"
                  name="reviewReference"
                  maxLength={200}
                />
              </div>
              <details className="rounded-xl border border-border p-4" open>
                <summary className="cursor-pointer text-sm font-semibold">
                  Dados tributários do emissor · preenchimento pela contabilidade
                </summary>
                <p className="mb-2 mt-2 text-xs text-muted-foreground">
                  Objeto JSON com os campos tributários do produto na API do emissor, incluindo
                  IBS/CBS quando aplicáveis. Não inclua preço, quantidade ou dados do emitente.
                </p>
                <label className="block text-sm">
                  Campos tributários
                  <textarea
                    name="attributes"
                    required
                    maxLength={30000}
                    spellCheck={false}
                    className="mt-1 min-h-40 w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
                    defaultValue={latest ? JSON.stringify(latest.attributes, null, 2) : ""}
                  />
                </label>
                <label className="mt-4 block text-sm">
                  Regras de cálculo revisadas
                  <textarea
                    name="calculationRules"
                    required
                    maxLength={30000}
                    spellCheck={false}
                    className="mt-1 min-h-32 w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
                    defaultValue={JSON.stringify(latest?.calculation_rules ?? [], null, 2)}
                  />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  Defina as bases e alíquotas aplicáveis ao produto. Os valores são calculados a
                  partir da venda; nenhuma alíquota é presumida.
                </p>
              </details>
              <Button type="submit">
                {mutation.isPending ? "Registrando…" : "Registrar perfil tributário"}
              </Button>
            </fieldset>
          </form>
        </>
      )}
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </section>
  );
}

function Documentos({
  slug,
  environment,
  documentId,
  canConfigure,
  onShowAll,
}: {
  slug: string;
  environment: AmbienteFiscal;
  documentId: string | undefined;
  canConfigure: boolean;
  onShowAll: () => void;
}) {
  const fetch = useServerFn(getFiscalDocuments);
  const q = useQuery({
    queryKey: ["fiscal-documents", slug, environment, documentId],
    queryFn: () => fetch({ data: { slug, environment, ...(documentId ? { documentId } : {}) } }),
    refetchInterval: 15000,
  });
  if (q.isPending) return <Carregando tamanho="sm" texto="Carregando documentos" />;
  if (q.isError) return <Falha mensagem={q.error.message} retry={() => void q.refetch()} />;
  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold">Documentos fiscais</h3>
        {documentId && (
          <Button size="sm" variant="ghost" onClick={onShowAll}>
            Todos os documentos
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void q.refetch()}>
          Atualizar
        </Button>
      </div>
      {!q.data.documents.length ? (
        <div className="flex items-start gap-3 py-6">
          <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-medium">Nenhum documento registrado neste ambiente.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O comprovante de pagamento continua separado da nota fiscal do restaurante.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Últimos 50 documentos fiscais do restaurante no ambiente selecionado
            </caption>
            <thead>
              <tr className="border-b border-border">
                {["Registro", "Modelo", "Situação", "Valor", "Chave ou referência", "Ações"].map(
                  (h) => (
                    <th key={h} scope="col" className="p-3 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {q.data.documents.map((d) => (
                <tr key={text(d.id)} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-3">{date(d.created_at, d.time_zone)}</td>
                  <td className="p-3 uppercase">{text(d.model)}</td>
                  <td className="p-3">
                    {d.state === "uncertain" && !d.send_started
                      ? "Requer conferência antes do envio"
                      : stateLabel[text(d.state)] || text(d.state)}
                    {d.sefaz_code && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        SEFAZ {d.sefaz_code}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 tabular-nums">{brl(d.amount_cents)}</td>
                  <td className="max-w-60 break-all p-3 text-xs">
                    {text(d.access_key) || text(d.provider_reference) || "—"}
                  </td>
                  <td className="min-w-60 p-3">
                    <FiscalDocumentoAcoes
                      slug={slug}
                      document={d}
                      environment={environment}
                      canCancel={canConfigure}
                      onQueued={() => void q.refetch()}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function Falha({ mensagem, retry }: { mensagem: string; retry: () => void }) {
  return (
    <div role="alert" className="surface-card space-y-3 p-4">
      <p className="text-sm text-destructive">{mensagem}</p>
      <Button variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </div>
  );
}
