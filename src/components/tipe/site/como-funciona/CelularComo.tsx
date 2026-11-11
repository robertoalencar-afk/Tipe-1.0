/**
 * Celular da seção "Como funciona". Usa o mesmo aparelho do CelularReal (classes de
 * celular-real.css, compartilhado com a abertura), mas aceita uma camada extra de câmera
 * para o primeiro passo: a câmera do cliente enquadrando o totem da mesa.
 * As telas trocam por opacidade em 300 ms (ver como-funciona.css).
 */
import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import totem360 from "@/assets/telas-v4/totem-360.webp";
import totem720 from "@/assets/telas-v4/totem-720.webp";
import { fotoSrc } from "../Foto";
import { telaReal, type TelaReal } from "../CelularReal";
import "../celular-real.css";

export type QuadroCelular =
  | { tipo: "camera"; alt: string }
  | { tipo: "tela"; tela: TelaReal; alt: string; toque?: { x: number; y: number } };

export function CelularComo({
  quadros,
  indice,
  tocar,
  sizes,
}: {
  quadros: QuadroCelular[];
  indice: number;
  /** Mostra o toque turquesa no botão (perto do fim do passo, só com animação). */
  tocar: boolean;
  sizes: string;
}) {
  // Carrega o quadro atual e o próximo; os já vistos ficam carregados.
  const [alcance, setAlcance] = useState(1);
  useEffect(() => setAlcance((a) => Math.max(a, indice + 1)), [indice]);
  const atual = quadros[indice];
  const camera = atual?.tipo === "camera";
  const fundo = fotoSrc("cena-casal");

  return (
    <div className="cel-real cf-cel-aparelho" data-camera={camera || undefined}>
      <i className="cel-btn acao" aria-hidden />
      <i className="cel-btn v1" aria-hidden />
      <i className="cel-btn v2" aria-hidden />
      <i className="cel-btn lig" aria-hidden />
      <div className="cel-bezel">
        <div className="cel-vidro">
          <span className="cel-ilha" aria-hidden />
          <div className="cel-status" aria-hidden>
            <span>21:16</span>
            <svg viewBox="0 0 64 12">
              <g fill="#0b1418">
                <rect x="0" y="8" width="3" height="4" rx="1" />
                <rect x="5" y="6" width="3" height="6" rx="1" />
                <rect x="10" y="3" width="3" height="9" rx="1" />
                <rect x="15" y="0" width="3" height="12" rx="1" />
                <path d="M28 3.5a9 9 0 0 1 12 0l-1.6 1.7a6.6 6.6 0 0 0-8.8 0zM30.9 6.6a5 5 0 0 1 6.2 0L34 10z" />
                <rect
                  x="45"
                  y="1"
                  width="16"
                  height="10"
                  rx="3"
                  fill="none"
                  stroke="#0b1418"
                  strokeOpacity=".45"
                />
                <rect x="47" y="3" width="11" height="6" rx="1.5" />
                <rect x="62" y="4.5" width="1.5" height="3" rx=".7" fillOpacity=".45" />
              </g>
            </svg>
          </div>
          <div className="cel-app">
            {quadros.map((q, i) => {
              const on = i === indice;
              if (q.tipo === "camera") {
                return (
                  <div
                    key={`camera-${i}`}
                    className="cf-camera cel-tela"
                    data-on={on || undefined}
                    role="img"
                    aria-label={on ? q.alt : undefined}
                    aria-hidden={!on || undefined}
                  >
                    <img
                      src={fundo.src}
                      alt=""
                      className="cf-camera-fundo"
                      decoding="async"
                      loading="lazy"
                    />
                    <img
                      src={totem360}
                      srcSet={`${totem360} 360w, ${totem720} 720w`}
                      sizes="30vw"
                      alt=""
                      width={360}
                      height={720}
                      className="cf-camera-totem"
                      decoding="async"
                    />
                    <span className="cf-mira" aria-hidden>
                      <i />
                      <i />
                      <i />
                      <i />
                      <span className="cf-mira-linha" />
                    </span>
                    <span className="cf-camera-link" aria-hidden>
                      <ScanLine />
                      <span>
                        <b>Abrir a conta da Mesa 12</b>
                        <small>Maré Alta · no navegador</small>
                      </span>
                    </span>
                  </div>
                );
              }
              const { src, srcSet } = telaReal(q.tela);
              const carregar = i <= alcance;
              return (
                <img
                  key={q.tela + i}
                  src={carregar ? src : undefined}
                  srcSet={carregar ? srcSet : undefined}
                  sizes={sizes}
                  width={390}
                  height={844}
                  alt={on ? q.alt : ""}
                  aria-hidden={!on || undefined}
                  loading="lazy"
                  decoding="async"
                  data-on={on || undefined}
                  className="cel-tela"
                />
              );
            })}
            {atual?.tipo === "tela" && atual.toque && (
              <span
                key={indice}
                className={cn("cel-toque")}
                data-on={tocar || undefined}
                style={{ left: `${atual.toque.x}%`, top: `${atual.toque.y}%` }}
                aria-hidden
              />
            )}
          </div>
          <span className="cel-home" aria-hidden />
        </div>
      </div>
    </div>
  );
}
