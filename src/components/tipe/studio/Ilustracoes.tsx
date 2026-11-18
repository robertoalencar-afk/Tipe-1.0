/**
 * Ilustrações técnicas do Estúdio (SVG, sem imagem externa): mostram a montagem da cena como
 * um diagrama de direção de fotografia. Tons da marca sobre o azul-marinho do painel.
 */
const T = "rgb(94 234 212)"; // turquesa clara
const B = "rgba(255,255,255,0.85)";
const F = "rgba(255,255,255,0.35)";
const FF = "rgba(255,255,255,0.12)";

export type TipoIlustracao =
  "cena" | "luz" | "angulo" | "vertical" | "foco" | "volume" | "relevo" | "palco" | "luz3d";

function Prato({ x = 160, y = 150, r = 54 }: { x?: number; y?: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 6} rx={r + 6} ry={r * 0.32 + 4} fill="rgba(0,0,0,0.35)" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill="none" stroke={B} strokeWidth="2" />
      <ellipse cx={x} cy={y} rx={r * 0.62} ry={r * 0.2} fill="none" stroke={F} strokeWidth="1.5" />
      <path
        d={`M${x - r * 0.4} ${y - 2} q${r * 0.2} -${r * 0.42} ${r * 0.4} -${r * 0.1} q${r * 0.2} -${r * 0.4} ${r * 0.42} ${r * 0.06}`}
        fill="none"
        stroke={T}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

function Celular({
  x,
  y,
  rot = 0,
  w = 34,
  h = 62,
}: {
  x: number;
  y: number;
  rot?: number;
  w?: number;
  h?: number;
}) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx="7"
        fill="#0b2a3c"
        stroke={B}
        strokeWidth="2"
      />
      <circle cx={x} cy={y - h / 2 + 7} r="2.5" fill={T} />
    </g>
  );
}

export function Ilustracao({ tipo }: { tipo: TipoIlustracao }) {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-hidden className="h-full w-full">
      <line x1="10" y1="196" x2="310" y2="196" stroke={FF} strokeWidth="2" />
      {tipo === "cena" && (
        <>
          <rect x="40" y="96" width="240" height="96" rx="12" fill={FF} />
          <Prato />
          <g opacity="0.75">
            <rect
              x="248"
              y="92"
              width="22"
              height="34"
              rx="4"
              fill="none"
              stroke={F}
              strokeWidth="2"
            />
            <line x1="240" y1="88" x2="278" y2="132" stroke="#f87171" strokeWidth="2.5" />
            <rect
              x="46"
              y="112"
              width="18"
              height="30"
              rx="4"
              fill="none"
              stroke={F}
              strokeWidth="2"
            />
            <line x1="40" y1="108" x2="70" y2="146" stroke="#f87171" strokeWidth="2.5" />
          </g>
          <text x="160" y="40" textAnchor="middle" fill={F} fontSize="12">
            mesa lisa · borda do prato limpa
          </text>
        </>
      )}
      {(tipo === "luz" || tipo === "luz3d") && (
        <>
          <rect
            x="18"
            y="34"
            width="54"
            height="96"
            rx="4"
            fill="rgba(94,234,212,0.12)"
            stroke={T}
            strokeWidth="2"
          />
          <line x1="45" y1="34" x2="45" y2="130" stroke={T} strokeWidth="1.5" />
          <line x1="18" y1="82" x2="72" y2="82" stroke={T} strokeWidth="1.5" />
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1="76"
              y1={52 + i * 20}
              x2="128"
              y2={112 + i * 10}
              stroke={T}
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeDasharray="5 6"
              className="motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]"
            />
          ))}
          <ellipse cx="214" cy="160" rx="40" ry="8" fill="rgba(0,0,0,0.35)" />
          <Prato x={170} />
          {tipo === "luz3d" && (
            <g>
              <circle cx="284" cy="56" r="14" fill="none" stroke="#f87171" strokeWidth="2" />
              <line x1="274" y1="46" x2="294" y2="66" stroke="#f87171" strokeWidth="2" />
              <text x="284" y="90" textAnchor="middle" fill={F} fontSize="11">
                sem flash
              </text>
            </g>
          )}
          <text x="45" y="150" textAnchor="middle" fill={F} fontSize="11">
            janela
          </text>
        </>
      )}
      {tipo === "angulo" && (
        <>
          <rect x="70" y="176" width="180" height="10" rx="3" fill={FF} />
          <path d="M120 174 q40 -26 80 0" fill="none" stroke={B} strokeWidth="2" />
          <path
            d="M132 166 q12 -14 26 -6 q12 -12 28 4"
            fill="none"
            stroke={T}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="160"
            y1="166"
            x2="262"
            y2="64"
            stroke={T}
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />
          <line
            x1="160"
            y1="166"
            x2="290"
            y2="166"
            stroke={F}
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
          <path d="M214 166 A54 54 0 0 0 198 128" fill="none" stroke={T} strokeWidth="2" />
          <text x="228" y="146" fill={T} fontSize="14" fontWeight="600">
            45°
          </text>
          <Celular x={268} y={58} rot={45} />
          <text x="40" y="40" fill={F} fontSize="11">
            altura de quem está sentado
          </text>
        </>
      )}
      {tipo === "vertical" && (
        <>
          <rect
            x="112"
            y="14"
            width="96"
            height="176"
            rx="14"
            fill="#0b2a3c"
            stroke={B}
            strokeWidth="2"
          />
          {[1, 2].map((i) => (
            <g key={i} stroke={F} strokeWidth="1">
              <line x1={112 + (96 / 3) * i} y1="20" x2={112 + (96 / 3) * i} y2="184" />
              <line x1="116" y1={14 + (176 / 3) * i} x2="204" y2={14 + (176 / 3) * i} />
            </g>
          ))}
          <rect
            x="124"
            y="64"
            width="72"
            height="76"
            rx="8"
            fill="none"
            stroke={T}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <Prato x={160} y={104} r={30} />
          <text x="230" y="104" fill={F} fontSize="11">
            margem
          </text>
          <text x="230" y="118" fill={F} fontSize="11">
            em volta
          </text>
        </>
      )}
      {tipo === "foco" && (
        <>
          <rect
            x="96"
            y="14"
            width="128"
            height="176"
            rx="16"
            fill="#0b2a3c"
            stroke={B}
            strokeWidth="2"
          />
          <Prato x={160} y={104} r={40} />
          <rect
            x="138"
            y="80"
            width="44"
            height="44"
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            className="motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]"
          />
          <rect x="140" y="160" width="40" height="18" rx="9" fill="rgba(255,255,255,0.15)" />
          <text x="160" y="173" textAnchor="middle" fill={B} fontSize="11" fontWeight="600">
            1x
          </text>
          <text x="250" y="96" fill={F} fontSize="11">
            toque
          </text>
          <text x="250" y="110" fill={F} fontSize="11">
            no prato
          </text>
        </>
      )}
      {tipo === "volume" && (
        <>
          <g transform="translate(36 40)">
            <rect width="88" height="120" rx="10" fill="#0b2a3c" stroke={B} strokeWidth="2" />
            <Prato x={44} y={70} r={30} />
          </g>
          <text x="80" y="182" textAnchor="middle" fill={F} fontSize="11">
            sua foto
          </text>
          <g transform="translate(150 40)">
            <defs>
              <radialGradient id="studio-prof" cx="50%" cy="58%" r="55%">
                <stop offset="0" stopColor="#fff" />
                <stop offset="1" stopColor="#111" />
              </radialGradient>
            </defs>
            <rect
              width="88"
              height="120"
              rx="10"
              fill="url(#studio-prof)"
              stroke={B}
              strokeWidth="2"
            />
          </g>
          <text x="194" y="182" textAnchor="middle" fill={F} fontSize="11">
            mapa de volume
          </text>
          <path d="M128 100 h16" stroke={T} strokeWidth="2" />
          <path d="M248 100 h22 l-6 -6 m6 6 l-6 6" fill="none" stroke={T} strokeWidth="2" />
          <text x="286" y="105" textAnchor="middle" fill={T} fontSize="14" fontWeight="600">
            3D
          </text>
        </>
      )}
      {tipo === "relevo" && (
        <>
          <rect x="40" y="40" width="240" height="140" rx="12" fill={FF} />
          <ellipse cx="160" cy="160" rx="70" ry="14" fill="rgba(0,0,0,0.4)" />
          <path
            d="M100 156 q60 -110 120 0 z"
            fill="rgba(94,234,212,0.18)"
            stroke={T}
            strokeWidth="2"
          />
          <path d="M70 152 h180" stroke={B} strokeWidth="2" />
          <path d="M276 70 v80" stroke={F} strokeWidth="1.5" />
          <path
            d="M270 76 l6 -6 l6 6 M270 144 l6 6 l6 -6"
            fill="none"
            stroke={F}
            strokeWidth="1.5"
          />
          <text x="290" y="114" fill={F} fontSize="11">
            altura
          </text>
        </>
      )}
      {tipo === "palco" && (
        <>
          <ellipse cx="160" cy="132" rx="130" ry="44" fill={FF} />
          <ellipse
            cx="160"
            cy="132"
            rx="130"
            ry="44"
            fill="none"
            stroke={T}
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <Prato y={126} r={44} />
          <text x="160" y="200" textAnchor="middle" fill={F} fontSize="11">
            espaço livre para andar em volta
          </text>
        </>
      )}
    </svg>
  );
}

/**
 * Órbita do Vídeo 3D: duas voltas em volta do prato, uma baixa e uma mais alta.
 * `angulo` em radianos posiciona o celular; `volta` destaca o anel em uso.
 */
export function Orbita({
  volta,
  angulo,
}: {
  volta: "baixa" | "alta" | "ambas";
  angulo?: number | undefined;
}) {
  const anel = { baixa: { ry: 40, rx: 128, cy: 140 }, alta: { ry: 22, rx: 96, cy: 82 } } as const;
  const usa = volta === "ambas" ? "baixa" : volta;
  const a = anel[usa];
  const ang = angulo ?? Math.PI * 0.35;
  const px = 160 + a.rx * Math.cos(ang);
  const py = a.cy + a.ry * Math.sin(ang);
  return (
    <svg viewBox="0 0 320 220" role="img" aria-hidden className="h-full w-full">
      <ellipse cx="160" cy="150" rx="140" ry="48" fill={FF} />
      {(["alta", "baixa"] as const).map((k) => {
        const r = anel[k];
        const on = volta === "ambas" || volta === k;
        return (
          <g key={k}>
            <ellipse
              cx="160"
              cy={r.cy}
              rx={r.rx}
              ry={r.ry}
              fill="none"
              stroke={on ? T : F}
              strokeWidth={on ? 2.5 : 1.5}
              strokeDasharray="7 7"
            />
            <text x={160 + r.rx + 6} y={r.cy + 4} fill={on ? T : F} fontSize="11">
              {k === "baixa" ? "volta 1" : "volta 2"}
            </text>
          </g>
        );
      })}
      <line x1="160" y1="82" x2="160" y2="140" stroke={FF} strokeWidth="1.5" />
      <Prato y={146} r={40} />
      <line x1={px} y1={py} x2="160" y2="140" stroke={T} strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx={px} cy={py} r="11" fill="#0b2a3c" stroke={T} strokeWidth="2.5" />
      <circle cx={px} cy={py} r="3.5" fill={T} />
    </svg>
  );
}
