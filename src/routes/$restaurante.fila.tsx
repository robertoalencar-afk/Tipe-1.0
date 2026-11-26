import { Carregando as CarregandoMarca, PontosCarregando } from "@/components/tipe/Carregando";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { nanoid } from "nanoid";
import { BellRing, Check, MapPin, Minus, Plus, Users } from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  entrarNaFila,
  infoFila,
  sairDaFila,
  statusFila,
  type FilaInfo,
  type FilaStatus,
} from "@/lib/tipe/guest/fila.functions";
import { MAX_ACCURACY_M, walkinPositionLabel } from "@/lib/tipe/guest/fila";

// Fila de espera presencial. O cliente chega pelo QR da porta; o celular confirma uma vez que ele está
// no restaurante e a localização não fica guardada. Sem login: o aparelho é identificado por uma chave
// aleatória guardada só neste navegador.
export const Route = createFileRoute("/$restaurante/fila")({
  ssr: false,
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({
    meta: [{ title: "Fila de espera · Tipe" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Fila,
});

type Salvo = { entryId: string; deviceKey: string };

function ler(k: string): string | null {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}
function gravar(k: string, v: string | null) {
  try {
    if (v === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, v);
  } catch {
    /* navegação privada: segue sem lembrar */
  }
}

function chaveAparelho(): string {
  const k = ler("tipe-fila-aparelho");
  if (k && /^[A-Za-z0-9_-]{16,80}$/.test(k)) return k;
  const novo = nanoid(32);
  gravar("tipe-fila-aparelho", novo);
  return novo;
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  });

function localizar(): Promise<GeolocationPosition> {
  return new Promise((ok, falha) => {
    if (!("geolocation" in navigator)) {
      falha(new Error("Este aparelho não informa a localização. Fale com a recepção"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ok,
      (e) => {
        falha(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Sem a localização não conseguimos confirmar que você está aqui. Libere a localização para este site ou fale com a recepção"
              : "Não conseguimos sua localização agora. Tente de novo perto da entrada",
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function Fila() {
  const { restaurante } = Route.useParams();
  const { t: token } = Route.useSearch();
  const chaveSalvo = `tipe-fila:${restaurante}`;
  const [info, setInfo] = useState<FilaInfo | null>(null);
  const [falhaRede, setFalhaRede] = useState(false);
  const [salvo, setSalvo] = useState<Salvo | null>(() => {
    try {
      const s = ler(chaveSalvo);
      return s ? (JSON.parse(s) as Salvo) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<FilaStatus>(null);
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState(2);
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState<null | "local" | "envio">(null);
  const [erro, setErro] = useState<string | null>(null);
  const saindo = useRef(false);

  useEffect(() => {
    if (!token) {
      setInfo({ ok: false, error: "invalid_token" });
      return;
    }
    let vivo = true;
    infoFila({ data: { slug: restaurante, token } })
      .then((r) => vivo && setInfo(r))
      .catch(() => vivo && setFalhaRede(true));
    return () => {
      vivo = false;
    };
  }, [restaurante, token]);

  // Acompanha a posição enquanto o grupo está na fila.
  useEffect(() => {
    if (!salvo) return;
    let vivo = true;
    const consultar = () =>
      statusFila({ data: salvo })
        .then((s) => {
          if (!vivo) return;
          setStatus(s);
          if (!s) {
            gravar(chaveSalvo, null);
            setSalvo(null);
          }
        })
        .catch(() => undefined);
    void consultar();
    const id = window.setInterval(consultar, 15000);
    const visivel = () => document.visibilityState === "visible" && void consultar();
    document.addEventListener("visibilitychange", visivel);
    return () => {
      vivo = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", visivel);
    };
  }, [salvo, chaveSalvo]);

  async function entrar() {
    if (!token || !info?.ok) return;
    setErro(null);
    if (nome.trim().length < 2) {
      setErro("Escreva o nome para chamarmos o seu grupo");
      return;
    }
    try {
      setEnviando("local");
      const pos = await localizar();
      if (pos.coords.accuracy > MAX_ACCURACY_M) {
        throw new Error(
          "Sua localização está imprecisa. Ative a localização precisa e tente perto da entrada",
        );
      }
      setEnviando("envio");
      const deviceKey = chaveAparelho();
      const r = await entrarNaFila({
        data: {
          slug: restaurante,
          token,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          deviceKey,
          name: nome.trim(),
          party: grupo,
          phone: telefone.trim() || undefined,
        },
      });
      const s = { entryId: r.entryId, deviceKey };
      gravar(chaveSalvo, JSON.stringify(s));
      setSalvo(s);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar na fila. Tente de novo");
    } finally {
      setEnviando(null);
    }
  }

  async function sair() {
    if (!salvo || saindo.current) return;
    saindo.current = true;
    try {
      await sairDaFila({ data: salvo });
      setStatus((s) => (s ? { ...s, status: "cancelado" } : s));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível sair da fila");
    } finally {
      saindo.current = false;
    }
  }

  function recomecar() {
    gravar(chaveSalvo, null);
    setSalvo(null);
    setStatus(null);
    setErro(null);
  }

  const restauranteNome = status?.restaurant ?? (info?.ok ? info.restaurant : "");

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-5">
        <header className="flex items-center justify-between">
          <TipeLogo variant="dark" className="h-7 w-auto" />
          <span className="text-xs text-muted-foreground">Fila de espera</span>
        </header>

        <section className="mt-8 flex-1">
          {salvo && status ? (
            <Acompanhar status={status} onSair={sair} onRecomecar={recomecar} erro={erro} />
          ) : salvo ? (
            <Carregando />
          ) : falhaRede ? (
            <Aviso
              titulo="Sem conexão"
              texto="Não conseguimos abrir a fila. Confira a internet e leia o QR de novo."
            />
          ) : !info ? (
            <Carregando />
          ) : !info.ok ? (
            <Aviso
              titulo="QR Code inválido"
              texto="Este QR foi trocado ou está incompleto. Leia o QR da porta do restaurante de novo ou fale com a recepção."
            />
          ) : !info.open ? (
            <Aviso
              titulo={info.restaurant}
              texto="A fila pelo celular não está aberta agora. Fale com a recepção para entrar na lista."
            />
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">{restauranteNome}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Entrar na fila</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {info.waiting === 0
                  ? "Ninguém aguardando agora."
                  : `${info.waiting} ${info.waiting === 1 ? "grupo aguardando" : "grupos aguardando"}.`}{" "}
                Avisamos aqui quando a mesa estiver pronta.
              </p>

              <form
                className="mt-6 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void entrar();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="fila-nome">Nome para chamar</Label>
                  <Input
                    id="fila-nome"
                    autoComplete="given-name"
                    maxLength={60}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label id="fila-grupo">Pessoas no grupo</Label>
                  <div
                    className="flex items-center gap-3"
                    role="group"
                    aria-labelledby="fila-grupo"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Menos uma pessoa"
                      disabled={grupo <= info.minParty}
                      onClick={() => setGrupo((g) => Math.max(info.minParty, g - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span
                      className="w-10 text-center text-lg font-semibold tabular-nums"
                      aria-live="polite"
                    >
                      {grupo}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Mais uma pessoa"
                      disabled={grupo >= info.maxParty}
                      onClick={() => setGrupo((g) => Math.min(info.maxParty, g + 1))}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fila-tel">Celular (opcional)</Label>
                  <Input
                    id="fila-tel"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(85) 9 9999-9999"
                    maxLength={20}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>

                <div className="flex gap-2.5 rounded-xl border bg-card p-3 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p>
                    Vamos pedir sua localização uma vez, só para confirmar que você está no
                    restaurante. Ela não fica guardada.
                  </p>
                </div>

                {erro && (
                  <p role="alert" className="text-sm text-destructive">
                    {erro}
                  </p>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full text-base"
                  disabled={enviando !== null}
                >
                  {enviando === "local" ? (
                    <>
                      <PontosCarregando className="text-base" /> Confirmando que você está aqui
                    </>
                  ) : enviando === "envio" ? (
                    <>
                      <PontosCarregando className="text-base" /> Entrando na fila
                    </>
                  ) : (
                    "Entrar na fila"
                  )}
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Carregando() {
  return <CarregandoMarca tamanho="sm" texto="Abrindo a fila" />;
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function Acompanhar({
  status,
  onSair,
  onRecomecar,
  erro,
}: {
  status: NonNullable<FilaStatus>;
  onSair: () => void;
  onRecomecar: () => void;
  erro: string | null;
}) {
  const ativo = status.status === "aguardando" || status.status === "convocado";
  const [confirmar, setConfirmar] = useState(false);
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {status.restaurant} · <Users className="inline size-3.5 align-[-2px]" /> {status.party}{" "}
        {status.party === 1 ? "pessoa" : "pessoas"}
      </p>

      {status.status === "convocado" ? (
        <div
          className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 p-5"
          role="status"
          aria-live="assertive"
        >
          <BellRing className="size-6 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sua mesa está pronta</h1>
          <p className="mt-1 text-sm">
            Apresente-se na recepção
            {status.respondBy ? ` até ${hora(status.respondBy)}` : ""}.
          </p>
        </div>
      ) : status.status === "aguardando" ? (
        <div className="mt-4" role="status" aria-live="polite">
          <h1 className="text-2xl font-semibold tracking-tight">Você está na fila</h1>
          <p className="mt-3 text-5xl font-semibold tabular-nums">{status.position}º</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {walkinPositionLabel(status.position)}. A posição é uma estimativa: grupos de tamanhos
            diferentes podem sentar antes.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Mantenha esta página aberta. Ela se atualiza sozinha.
          </p>
        </div>
      ) : status.status === "confirmado" ? (
        <div className="mt-4">
          <Check className="size-6 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Bom apetite</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seu grupo já foi acomodado.</p>
        </div>
      ) : (
        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {status.status === "expirado" ? "O prazo passou" : "Você saiu da fila"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {status.status === "expirado"
              ? "Não encontramos seu grupo a tempo. Fale com a recepção se ainda estiver aqui."
              : "Se mudar de ideia, é só entrar de novo."}
          </p>
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="mt-8">
        {ativo && confirmar ? (
          <div className="space-y-2">
            <p className="text-sm">Sair da fila? Seu lugar vai para o próximo grupo.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={() => setConfirmar(false)}>
                Continuar na fila
              </Button>
              <Button
                variant="destructive"
                className="h-11"
                onClick={() => {
                  setConfirmar(false);
                  onSair();
                }}
              >
                Sair da fila
              </Button>
            </div>
          </div>
        ) : ativo ? (
          <Button variant="outline" className="h-11 w-full" onClick={() => setConfirmar(true)}>
            Sair da fila
          </Button>
        ) : (
          <Button variant="outline" className="h-11 w-full" onClick={onRecomecar}>
            Entrar de novo
          </Button>
        )}
      </div>
    </div>
  );
}
