/**
 * Foto 3D: uma foto comum ganha profundidade, como no Lupa.art. Usa a foto e um mapa de
 * profundidade (branco = perto, preto = longe), gerado de graça por um modelo de
 * profundidade monocular. Um shader WebGL desloca cada pixel conforme a profundidade,
 * seguindo:
 * - o dedo ou o mouse;
 * - a inclinação do celular, quando o aparelho permite;
 * - um balanço suave quando ninguém mexe.
 *
 * Sem WebGL, ou com movimento reduzido, mostra a foto parada. Não usa nenhuma
 * biblioteca: é só WebGL 1.
 */
import { useEffect, useRef, useState } from "react";
import { useMovimentoReduzido } from "../produto/useVisivel";

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

// Paralaxe com busca em passos (parallax occlusion simplificado): reduz o "rasgo" nas bordas
// dos objetos em comparação com um deslocamento direto.
const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D foto;
uniform sampler2D prof;
uniform vec2 desloc;
uniform vec2 escala;
uniform float foco;
void main() {
  vec2 base = (uv - 0.5) * escala + 0.5;
  vec2 dir = desloc;
  const int PASSOS = 14;
  vec2 c = base;
  for (int i = 0; i < PASSOS; i++) {
    float d = texture2D(prof, c).r;
    c = base + dir * (d - foco);
  }
  c = clamp(c, vec2(0.002), vec2(0.998));
  gl_FragColor = texture2D(foto, c);
}`;

function carregar(src: string) {
  return new Promise<HTMLImageElement>((ok, erro) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => ok(im);
    im.onerror = erro;
    im.src = src;
  });
}

export function Foto3D({
  foto,
  profundidade,
  alt,
  intensidade = 0.08,
  ativo = true,
  className,
}: {
  foto: string;
  profundidade: string;
  alt: string;
  /** Quanto a imagem se move (fração da largura). */
  intensidade?: number;
  /** Quando falso, a animação para (ex.: story pausado). */
  ativo?: boolean;
  className?: string;
}) {
  const reduzido = useMovimentoReduzido();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pronto, setPronto] = useState(false);
  const alvo = useRef({ x: 0, y: 0, tocado: 0 });
  const ativoRef = useRef(ativo);
  ativoRef.current = ativo;

  useEffect(() => {
    if (reduzido) return;
    const cv = canvas.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    let vivo = true;
    let raf = 0;
    let limpar = () => {};

    Promise.all([carregar(foto), carregar(profundidade)])
      .then(([imF, imP]) => {
        if (!vivo) return;
        const sh = (tipo: number, src: string) => {
          const s = gl.createShader(tipo)!;
          gl.shaderSource(s, src);
          gl.compileShader(s);
          return s;
        };
        const prog = gl.createProgram()!;
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const tex = (im: HTMLImageElement, unidade: number) => {
          const t = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + unidade);
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        };
        tex(imF, 0);
        tex(imP, 1);
        gl.uniform1i(gl.getUniformLocation(prog, "foto"), 0);
        gl.uniform1i(gl.getUniformLocation(prog, "prof"), 1);
        gl.uniform1f(gl.getUniformLocation(prog, "foco"), 0.5);
        const uDesloc = gl.getUniformLocation(prog, "desloc");
        const uEscala = gl.getUniformLocation(prog, "escala");

        // object-fit: cover, com 6% de margem para o deslocamento não mostrar borda.
        const ajustar = () => {
          const r = cv.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          cv.width = Math.max(1, Math.round(r.width * dpr));
          cv.height = Math.max(1, Math.round(r.height * dpr));
          gl.viewport(0, 0, cv.width, cv.height);
          const aTela = r.width / Math.max(1, r.height);
          const aFoto = imF.width / imF.height;
          const m = 0.94;
          gl.uniform2f(
            uEscala,
            aTela > aFoto ? m : (m * aTela) / aFoto,
            aTela > aFoto ? (m * aFoto) / aTela : m,
          );
        };
        ajustar();
        const ro = new ResizeObserver(ajustar);
        ro.observe(cv);

        const atual = { x: 0, y: 0 };
        const t0 = performance.now();
        const quadro = (t: number) => {
          raf = requestAnimationFrame(quadro);
          if (!ativoRef.current) return;
          const ocioso = t - alvo.current.tocado > 1800;
          const s = (t - t0) / 1000;
          const ax = ocioso ? Math.sin(s * 1.1) * 1 : alvo.current.x;
          const ay = ocioso ? Math.cos(s * 0.8) * 0.6 : alvo.current.y;
          atual.x += (ax - atual.x) * 0.08;
          atual.y += (ay - atual.y) * 0.08;
          gl.uniform2f(uDesloc, atual.x * intensidade, atual.y * intensidade);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        raf = requestAnimationFrame(quadro);
        setPronto(true);

        const inclinar = (e: DeviceOrientationEvent) => {
          if (e.gamma == null || e.beta == null) return;
          alvo.current = {
            x: Math.max(-1, Math.min(1, e.gamma / 25)),
            y: Math.max(-1, Math.min(1, (e.beta - 45) / 25)),
            tocado: performance.now(),
          };
        };
        // O mouse ou o dedo em qualquer lugar sobre a foto (camadas de gesto por cima incluídas).
        const ponteiro = (e: PointerEvent) => {
          const r = cv.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            return;
          alvo.current = {
            x: ((e.clientX - r.left) / r.width) * 2 - 1,
            y: ((e.clientY - r.top) / r.height) * 2 - 1,
            tocado: performance.now(),
          };
        };
        window.addEventListener("deviceorientation", inclinar);
        window.addEventListener("pointermove", ponteiro, { passive: true });
        limpar = () => {
          ro.disconnect();
          window.removeEventListener("deviceorientation", inclinar);
          window.removeEventListener("pointermove", ponteiro);
        };
      })
      .catch(() => setPronto(false));

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      limpar();
    };
  }, [foto, profundidade, intensidade, reduzido]);

  return (
    <div className={className} style={{ position: "absolute", inset: 0 }}>
      <img
        src={foto}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
        style={{ opacity: pronto ? 0 : 1 }}
      />
      {!reduzido && (
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 h-full w-full"
          style={{ opacity: pronto ? 1 : 0, transition: "opacity 300ms" }}
        />
      )}
    </div>
  );
}
