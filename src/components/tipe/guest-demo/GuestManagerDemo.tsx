/**
 * Tipe Reserva Manager · demonstração (Projeto 4). Recepção com "Próximas chegadas", mapa do salão
 * com as MESMAS mesas do Tipe Gestão (estados livre, reservada, ocupada, fechando conta, em
 * limpeza, bloqueada) e prévia da disponibilidade. A troca de mesa valida conflito com a mesma
 * regra do banco (podeAlocar). Dados fictícios do Maré Alta; nada é salvo.
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoTipe } from "@/components/tipe/site/marca/LogoTipe";
import { localDay, localInstant, localTime } from "@/lib/tipe/guest/reservas";
import { guestCan, GUEST_ROLES, profileFor, type GuestRole } from "@/lib/tipe/guest/permissoes";
import {
  ESTADO_MESA_LABEL,
  horariosLivres,
  podeAlocar,
  VITRINE,
  VITRINE_SETTINGS as S,
  type Alocacao,
  type EstadoMesa,
} from "@/lib/tipe/guest/vitrine";

type Mesa = {
  id: string;
  numero: string;
  seatsMin: number;
  seatsMax: number;
  x: number;
  y: number;
  w: number;
  h: number;
  estado: EstadoMesa;
};
type Res = {
  id: string;
  nome: string;
  telefone: string;
  pessoas: number;
  hora: string;
  mesaId: string | null;
  status: "confirmada" | "chegou" | "sentada";
  pedidos: string;
  alergias: string;
  visitas: number;
  gastoCents: number;
};

const MESAS0: Mesa[] = [
  { id: "m1", numero: "1", seatsMin: 1, seatsMax: 2, x: 6, y: 8, w: 14, h: 18, estado: "livre" },
  { id: "m2", numero: "2", seatsMin: 1, seatsMax: 2, x: 24, y: 8, w: 14, h: 18, estado: "ocupada" },
  {
    id: "m4",
    numero: "4",
    seatsMin: 2,
    seatsMax: 4,
    x: 46,
    y: 8,
    w: 20,
    h: 18,
    estado: "fechando",
  },
  { id: "m7", numero: "7", seatsMin: 2, seatsMax: 4, x: 6, y: 44, w: 20, h: 20, estado: "livre" },
  {
    id: "m8",
    numero: "8",
    seatsMin: 2,
    seatsMax: 4,
    x: 32,
    y: 44,
    w: 20,
    h: 20,
    estado: "limpeza",
  },
  { id: "m9", numero: "9", seatsMin: 4, seatsMax: 8, x: 60, y: 44, w: 32, h: 22, estado: "livre" },
  {
    id: "m10",
    numero: "V1",
    seatsMin: 2,
    seatsMax: 4,
    x: 72,
    y: 8,
    w: 20,
    h: 18,
    estado: "bloqueada",
  },
];

const RES0: Res[] = [
  {
    id: "r1",
    nome: "Ana Clara Souza",
    telefone: "(85) 99999-0001",
    pessoas: 2,
    hora: "19:30",
    mesaId: "m1",
    status: "confirmada",
    pedidos: "Aniversário",
    alergias: "Camarão",
    visitas: 4,
    gastoCents: 48000,
  },
  {
    id: "r2",
    nome: "Bruno Lima",
    telefone: "(85) 99999-0002",
    pessoas: 4,
    hora: "20:00",
    mesaId: null,
    status: "confirmada",
    pedidos: "Varanda",
    alergias: "",
    visitas: 1,
    gastoCents: 0,
  },
  {
    id: "r3",
    nome: "Carla Mendes",
    telefone: "(85) 99999-0003",
    pessoas: 6,
    hora: "20:30",
    mesaId: "m9",
    status: "confirmada",
    pedidos: "Cadeira para bebê",
    alergias: "Lactose",
    visitas: 2,
    gastoCents: 61000,
  },
  {
    id: "r4",
    nome: "Diego Rocha",
    telefone: "(85) 99999-0004",
    pessoas: 3,
    hora: "21:00",
    mesaId: "m7",
    status: "confirmada",
    pedidos: "",
    alergias: "",
    visitas: 0,
    gastoCents: 0,
  },
];

const COR: Record<EstadoMesa, string> = {
  livre: "bg-white border-[#021E34]/20",
  reservada: "bg-[#0FC9BD]/15 border-[#0FC9BD]",
  ocupada: "bg-[#021E34] text-white border-[#021E34]",
  fechando: "bg-amber-100 border-amber-400",
  limpeza: "bg-sky-100 border-sky-300 border-dashed",
  bloqueada:
    "bg-[repeating-linear-gradient(45deg,#eef1f4,#eef1f4_6px,#fff_6px,#fff_12px)] border-[#021E34]/15 text-[#5b6b78]",
};

const PAPEL: Record<GuestRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  caixa: "Caixa",
  garcom: "Garçom",
};

export function GuestManagerDemo() {
  const agora = useMemo(() => new Date(), []);
  const dia = localDay(agora, S);
  const [papel, setPapel] = useState<GuestRole>("gerente");
  const [mesas, setMesas] = useState(MESAS0);
  const [res, setRes] = useState(RES0);
  const [sel, setSel] = useState<string | null>("r2");
  const [aviso, setAviso] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);

  const faixa = (r: Res) => {
    const inicio = localInstant(dia, r.hora, S);
    return { inicio, fim: new Date(inicio.getTime() + (S.durationMin + S.bufferMin) * 60_000) };
  };
  const alocacoes: Alocacao[] = res
    .filter((r) => r.mesaId)
    .map((r) => ({ reservaId: r.id, mesaId: r.mesaId!, ...faixa(r) }));
  const estadoDe = (m: Mesa): EstadoMesa =>
    m.estado === "livre" && res.some((r) => r.mesaId === m.id && r.status !== "sentada")
      ? "reservada"
      : m.estado;
  const podeMesa = guestCan(papel, "atribuir_mesa");
  const podeChegada = guestCan(papel, "confirmar_chegada");
  const reservaSel = res.find((r) => r.id === sel) ?? null;

  function clicarMesa(m: Mesa) {
    if (!reservaSel) return;
    if (!podeMesa)
      return setAviso(`${PAPEL[papel]} não atribui mesa sem autorização do administrador.`);
    const v = podeAlocar({
      mesa: { ...m, estado: m.estado },
      pessoas: reservaSel.pessoas,
      ...faixa(reservaSel),
      alocacoes,
      reservaId: reservaSel.id,
    });
    if (!v.ok) return setAviso(`Mesa ${m.numero}: ${v.motivo}.`);
    setRes((x) => x.map((r) => (r.id === reservaSel.id ? { ...r, mesaId: m.id } : r)));
    setAviso(`${reservaSel.nome.split(" ")[0]} vai para a mesa ${m.numero}.`);
  }

  function avancar(r: Res) {
    if (!podeChegada) return setAviso(`${PAPEL[papel]} não confirma chegada sem autorização.`);
    if (r.status === "confirmada")
      return setRes((x) => x.map((y) => (y.id === r.id ? { ...y, status: "chegou" } : y)));
    if (!r.mesaId) return setAviso("Escolha a mesa antes de sentar.");
    setRes((x) => x.map((y) => (y.id === r.id ? { ...y, status: "sentada" } : y)));
    setMesas((x) => x.map((m) => (m.id === r.mesaId ? { ...m, estado: "ocupada" } : m)));
  }

  const proximo: Partial<Record<EstadoMesa, EstadoMesa>> = {
    ocupada: "fechando",
    fechando: "limpeza",
    limpeza: "livre",
  };
  const pessoasHoje = res.reduce((t, r) => t + r.pessoas, 0);
  const perfilRes = res.find((r) => r.id === perfil);

  return (
    <div className="min-h-[720px] bg-[#F6F8FA] text-[#021E34]">
      <header className="border-b border-[#021E34]/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoTipe titulo="Tipe" className="h-6 w-auto shrink-0" />
            <div className="min-w-0 border-l border-[#021E34]/15 pl-2.5 leading-tight">
              <p className="font-display text-[0.95rem] font-semibold tracking-[-0.01em]">
                Gestão de reservas
              </p>
              <p className="text-xs text-[#5b6b78]">Maré Alta · restaurante fictício</p>
            </div>
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm">
            Ver como
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as GuestRole)}
              className="rounded-full border border-[#021E34]/15 px-3 py-1.5"
            >
              {GUEST_ROLES.map((r) => (
                <option key={r} value={r}>
                  {PAPEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[340px_1fr]">
        <section
          aria-label="Próximas chegadas"
          className="rounded-[1.4rem] border border-[#021E34]/10 bg-white p-4"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Próximas chegadas</h2>
            <p className="text-xs text-[#5b6b78]">
              {res.length} reservas · {pessoasHoje} pessoas
            </p>
          </div>
          <ul className="mt-3 space-y-2">
            {[...res]
              .sort((a, b) => a.hora.localeCompare(b.hora))
              .map((r) => {
                const mesa = mesas.find((m) => m.id === r.mesaId);
                const ver = profileFor(papel, {
                  name: r.nome,
                  phone: r.telefone,
                  allergies: r.alergias || null,
                  occasions: r.pedidos || null,
                  visits: r.visitas,
                });
                return (
                  <li key={r.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSel(r.id)}
                      onKeyDown={(e) => e.key === "Enter" && setSel(r.id)}
                      className={cn(
                        "rounded-xl border p-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0FC9BD]",
                        sel === r.id
                          ? "border-[#021E34] bg-[#021E34]/[.03]"
                          : "border-[#021E34]/10",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold tabular-nums">
                          {r.hora}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{ver.name}</span>
                        <span className="text-xs">{r.pessoas}p</span>
                      </div>
                      <p className="text-xs text-[#5b6b78]">
                        {mesa ? `Mesa ${mesa.numero}` : "Sem mesa"} ·{" "}
                        {r.status === "confirmada"
                          ? "Confirmada"
                          : r.status === "chegou"
                            ? "Chegou"
                            : "Sentada"}
                        {ver.allergies ? ` · Alergia: ${ver.allergies}` : ""}
                        {ver.occasions ? ` · ${ver.occasions}` : ""}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {r.status !== "sentada" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              avancar(r);
                            }}
                            className="rounded-full bg-[#021E34] px-3 py-1 text-xs text-white"
                          >
                            {r.status === "confirmada" ? "Chegou" : "Sentar"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPerfil(r.id);
                          }}
                          className="rounded-full border border-[#021E34]/20 px-3 py-1 text-xs"
                        >
                          Perfil
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>

        <div className="space-y-4">
          <section
            aria-label="Mapa do salão"
            className="rounded-[1.4rem] border border-[#021E34]/10 bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-semibold">Salão</h2>
              <p className="text-xs text-[#5b6b78]">
                {reservaSel
                  ? `Toque numa mesa para colocar ${reservaSel.nome.split(" ")[0]} (${reservaSel.pessoas}p às ${reservaSel.hora}).`
                  : "Escolha uma reserva."}{" "}
                As mesas são as mesmas do Tipe Gestão.
              </p>
            </div>
            <div className="relative mt-3 aspect-[5/6] rounded-xl sm:aspect-[16/9] bg-[#F6F8FA]">
              <span className="absolute bottom-2 left-3 text-[0.65rem] uppercase tracking-wide text-[#5b6b78]">
                Entrada
              </span>
              <span className="absolute right-3 top-1 text-[0.65rem] uppercase tracking-wide text-[#5b6b78]">
                Varanda
              </span>
              {mesas.map((m) => {
                const e = estadoDe(m);
                const quem = res.find((r) => r.mesaId === m.id && r.status !== "sentada");
                return (
                  <div
                    key={m.id}
                    style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%` }}
                    className="absolute"
                  >
                    <button
                      type="button"
                      onClick={() => clicarMesa(m)}
                      aria-label={`Mesa ${m.numero}, ${ESTADO_MESA_LABEL[e]}, até ${m.seatsMax} pessoas`}
                      className={cn(
                        "flex h-full w-full flex-col items-center justify-center rounded-xl border-2 text-xs transition-transform hover:scale-[1.03]",
                        COR[e],
                      )}
                    >
                      <span className="font-display text-base font-semibold">{m.numero}</span>
                      <span className="opacity-70">
                        {m.seatsMin}-{m.seatsMax}p
                      </span>
                      {quem && <span className="truncate px-1 text-[0.65rem]">{quem.hora}</span>}
                    </button>
                    {proximo[e] && (
                      <button
                        type="button"
                        onClick={() =>
                          setMesas((x) =>
                            x.map((y) => (y.id === m.id ? { ...y, estado: proximo[e]! } : y)),
                          )
                        }
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[0.6rem] shadow"
                      >
                        {e === "ocupada" ? "Fechar conta" : e === "fechando" ? "Limpar" : "Liberar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {(Object.keys(ESTADO_MESA_LABEL) as EstadoMesa[]).map((e) => (
                <span key={e} className="flex items-center gap-1.5">
                  <span className={cn("h-3 w-3 rounded border-2", COR[e])} /> {ESTADO_MESA_LABEL[e]}
                </span>
              ))}
            </div>
            {aviso && (
              <p
                className="mt-3 rounded-xl bg-[#021E34]/[.05] px-3 py-2 text-sm"
                aria-live="polite"
              >
                {aviso}
              </p>
            )}
          </section>

          <Disponibilidade papel={papel} agora={agora} dia={dia} />
        </div>
      </main>

      {perfilRes && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Perfil do cliente"
          className="fixed inset-0 z-30 grid place-items-end bg-black/30 sm:place-items-center"
          onClick={() => setPerfil(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-[1.4rem] bg-white p-5 sm:rounded-[1.4rem]"
          >
            <p className="text-xs text-[#5b6b78]">
              Perfil neste restaurante · visto como {PAPEL[papel]}
            </p>
            {Object.entries(
              profileFor(papel, {
                name: perfilRes.nome,
                phone: perfilRes.telefone,
                email: "cliente@exemplo.com",
                visits: perfilRes.visitas,
                notes: perfilRes.pedidos || null,
                allergies: perfilRes.alergias || null,
                spendCents: perfilRes.gastoCents,
              }),
            )
              .filter(([, v]) => v !== undefined && v !== null && v !== "")
              .map(([k, v]) => (
                <p key={k} className="mt-2 text-sm">
                  <span className="text-[#5b6b78]">{ROTULO[k] ?? k}: </span>
                  {k === "spendCents"
                    ? ((v as number) / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : String(v)}
                </p>
              ))}
            <p className="mt-3 text-[0.7rem] text-[#5b6b78]">
              Só dados deste restaurante. Outros restaurantes nunca aparecem aqui.
            </p>
            <button
              type="button"
              onClick={() => setPerfil(null)}
              className="mt-4 w-full rounded-full bg-[#021E34] py-2.5 text-sm text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ROTULO: Record<string, string> = {
  name: "Nome",
  phone: "Telefone",
  email: "E-mail",
  visits: "Visitas",
  notes: "Observações",
  allergies: "Alergias",
  occasions: "Ocasião",
  spendCents: "Gasto total",
};

function Disponibilidade({ papel, agora, dia }: { papel: GuestRole; agora: Date; dia: string }) {
  const r = VITRINE[0]!;
  const pode = guestCan(papel, "alterar_disponibilidade");
  const [pessoas, setPessoas] = useState(4);
  const livres = horariosLivres(r, dia, pessoas, agora);
  return (
    <section
      aria-label="Disponibilidade"
      className="rounded-[1.4rem] border border-[#021E34]/10 bg-white p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Prévia da disponibilidade</h2>
        <select
          aria-label="Grupo"
          value={pessoas}
          onChange={(e) => setPessoas(Number(e.target.value))}
          className="rounded-full border border-[#021E34]/15 px-3 py-1 text-sm"
        >
          {[2, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              Grupo de {n}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-[#5b6b78]">
        O que o cliente vê agora no app, pelo mesmo motor de reservas.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {livres.length ? (
          livres.map((d) => (
            <span
              key={d.getTime()}
              className="rounded-full bg-[#0FC9BD]/15 px-2.5 py-1 text-xs tabular-nums"
            >
              {localTime(d, S)}
            </span>
          ))
        ) : (
          <span className="text-sm text-[#5b6b78]">Sem horário livre hoje para {pessoas}.</span>
        )}
      </div>
      <p className="mt-3 text-xs">
        {pode
          ? "Você pode mudar turnos e bloqueios. Toda mudança fica no histórico."
          : "Mudar turnos e bloqueios precisa de permissão do administrador."}
      </p>
    </section>
  );
}
