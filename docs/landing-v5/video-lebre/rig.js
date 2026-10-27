/* ---------- personagens vivos (rig 2D sobre a imagem) ----------
   Cada osso é uma elipse suave (centro, raios, ângulo, borda) que gira/escala/desloca a
   imagem em volta de um pivô. A piscada comprime a região do olho na vertical até virar
   um traço e depois abre de novo. Coordenadas em pixels da cena original 1600x893;
   X0 é onde começa o recorte de cada metade do díptico. Tudo depende só de t (determinístico). */
const TAU_ = Math.PI * 2;
const osc = (t, per, ph = 0) => Math.sin(TAU_ * (t / per + ph));
const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
// janela suave: 0 fora de [a,b], 1 no meio, rampas de r segundos
const win = (t, a, b, r = 0.25) => sm((t - a) / r) * sm((b - t) / r);
// piscada: fecha rápido, segura um tiquinho, abre um pouco mais devagar
function blinkK(t, list, close = 0.07, hold = 0.04, open = 0.11) {
  let k = 1;
  for (const b of list) {
    const c = Array.isArray(b) ? b : [b, 1];
    const s = c[1];
    const d = t - c[0];
    if (d < 0 || d > (close + hold + open) * s) continue;
    let v;
    if (d < close * s) v = sm(d / (close * s));
    else if (d < (close + hold) * s) v = 1;
    else v = 1 - sm((d - (close + hold) * s) / (open * s));
    k = Math.min(k, 1 - 0.94 * v);
  }
  return k;
}
// uma "batida" de orelha: sobe e volta com uma oscilação amortecida, curta e discreta
const flick = (t, t0, amp) => { const d = t - t0; return d < 0 || d > 0.8 ? 0 : amp * Math.sin(d * 11) * Math.exp(-d * 5); };
// um gesto: sobe e desce suave (sen²) em `dur` segundos a partir de t0; 0 fora disso
const bump = (t, t0, dur) => { const p = (t - t0) / dur; return p <= 0 || p >= 1 ? 0 : Math.pow(Math.sin(Math.PI * p), 2); };
// batida de coração: duas pulsadas a cada `per` segundos
const heart = (t, per) => { const p = ((t % per) + per) % per; return bump(p, 0, 0.2) + 0.55 * bump(p, 0.24, 0.2); };

const X0 = { 'T-cliente': 0, 'H-cliente': 812, 'H-amigos': 806, 'H-gorjeta': 815 };

/* V6 (27/10, pedido do Roberto: "a movimentação não ficou boa"). Regras novas: nada balança
   o tempo todo. Cada personagem respira devagar (período de 2,6 a 3,4 s, menos de 1% de
   escala) e faz UM gesto com começo, meio e fim (suspiro, aceno, aceno de cabeça), com
   as orelhas acompanhando o gesto com um pequeno atraso (follow-through). Amplitudes
   menores, máscaras com borda mais larga para a imagem não "derreter", piscadas no
   ritmo natural. A cena dos três amigos saiu: com 15 ossos, parecia gelatina. */
const RIGS = {
  /* a tartaruga: respira pesado, acena chamando o garçom, o relógio toca, suspira e pisca com sono */
  'T-cliente': [
    { m: [300, 430, 190, 230], f: .45, piv: [300, 640], at: t => ({ sy: 1 + .008 * osc(t, 3.4, .1), sx: 1 - .003 * osc(t, 3.4, .1) }) },
    { m: [392, 300, 82, 92], f: .4, piv: [372, 392], at: t => ({ a: .7 * osc(t, 4.2, .3) - 1.6 * bump(t, 2.3, 1.5), ty: 3 * bump(t, 2.3, 1.5) }) },
    { m: [470, 326, 36, 50], ang: 10, f: .55, piv: [452, 378], at: t => ({ a: 4.5 * osc(t, .95) * bump(t, .45, 1.8) }) },
    { m: [628, 412, 68, 74], f: .4, piv: [628, 480], at: t => ({ a: 1.2 * Math.sin(t * TAU_ * 12) * (bump(t, 1.35, .45) + bump(t, 3.05, .4)) }) },
    { blink: [398, 319, 22, 20, 9], k: t => blinkK(t, [[1.15, 2.6], [3.75, 2.6]]) },
    { blink: [467, 314, 11, 18, 9], k: t => blinkK(t, [[1.15, 2.6], [3.75, 2.6]]) },
  ],
  /* a lebre com o celular: respira, olha o "pago", acena com a cabeça e as orelhas vêm atrás */
  'H-cliente': [
    { m: [1300, 520, 150, 280], f: .4, piv: [1300, 780], at: t => ({ sy: 1 + .007 * osc(t, 2.8), sx: 1 - .003 * osc(t, 2.8) }) },
    { m: [1300, 300, 115, 250], f: .35, piv: [1300, 455], at: t => ({ a: .5 * osc(t, 3.6, .2) + 2.4 * bump(t, 5.45, 1.1) }) },
    { m: [1272, 175, 34, 120], ang: -6, f: .5, piv: [1282, 292], at: t => ({ a: -.8 * osc(t, 4.4) + 1.8 * bump(t, 5.6, 1.15) + flick(t, 6.85, -5) }) },
    { m: [1372, 175, 34, 120], ang: 18, f: .5, piv: [1338, 292], at: t => ({ a: .8 * osc(t, 4.9, .3) + 1.8 * bump(t, 5.65, 1.15) + flick(t, 6.93, 4.5) }) },
    { m: [1137, 332, 74, 74], f: .55, piv: [1137, 332], at: t => ({ ty: -4 * osc(t, 2.4), sx: 1 + .012 * osc(t, 1.2), sy: 1 + .012 * osc(t, 1.2) }) },
    { m: [1185, 470, 60, 60], f: .5, piv: [1225, 520], at: t => ({ a: 1.2 * osc(t, 2.2, .5) }) },
    { blink: [1254, 377, 12, 17, 16], k: t => blinkK(t, [5.0, 7.15, 7.38]) },
    { blink: [1311, 382, 13, 15, 15], k: t => blinkK(t, [5.0, 7.15, 7.38]) },
  ],
  /* sem uso desde a V6 (mantido para referência das coordenadas) */
  'H-amigos': [],
  /* a lebre da gorjeta: olhos fechados de alegria; balança devagar, orelhas atrasadas, coração bate */
  'H-gorjeta': [
    { m: [1255, 590, 120, 250], f: .4, piv: [1255, 790], at: t => ({ sy: 1 + .007 * osc(t, 2.6, .2), sx: 1 - .003 * osc(t, 2.6, .2) }) },
    { m: [1250, 300, 115, 240], f: .35, piv: [1250, 462], at: t => ({ a: 1.5 * osc(t, 2.4) }) },
    { m: [1196, 200, 36, 110], ang: -10, f: .5, piv: [1213, 300], at: t => ({ a: 1.9 * osc(t, 2.4, -.07) + flick(t, 8.95, -4.5) }) },
    { m: [1313, 195, 36, 110], ang: 10, f: .5, piv: [1288, 300], at: t => ({ a: 1.9 * osc(t, 2.4, -.09) + flick(t, 9.02, 4) }) },
    { m: [1178, 474, 26, 26], f: .6, piv: [1178, 474], at: t => ({ ty: -3 * osc(t, 2.2), sx: 1 + .07 * heart(t, 1.1), sy: 1 + .07 * heart(t, 1.1) }) },
  ],
};

const VS = 'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
const FS = `precision highp float;
uniform sampler2D T;uniform vec2 S;uniform int N;
uniform vec4 A[16];uniform vec4 B[16];uniform vec4 C[16];uniform vec4 D[16];
varying vec2 v;
void main(){
  vec2 p=v*S; vec2 d=vec2(0.); vec3 ovC=vec3(0.); float ovA=0.; float lineA=0.;
  for(int i=0;i<16;i++){
    if(i>=N) break;
    vec4 a=A[i],b=B[i],c=C[i],e=D[i];
    if(b.z<.5){
      vec2 q=p-a.xy; float ca=cos(b.x),sa=sin(b.x);
      vec2 l=vec2(ca*q.x+sa*q.y,-sa*q.x+ca*q.y);
      float w=1.-smoothstep(1.,1.+b.y,length(l/a.zw));
      vec2 r=(p-c.xy-c.zw)/e.zw;
      vec2 src=c.xy+vec2(e.x*r.x+e.y*r.y,-e.y*r.x+e.x*r.y);
      d+=w*(src-p);
    } else {
      /* piscada como pálpebra: dentro de uma elipse suave em volta do olho, a pele de
         logo acima desce até a linha da pálpebra, com uma sombra fina na borda.
         (26/10: a versão antiga esticava uma faixa e deixava um retângulo visível.) */
      vec2 q=p+d-a.xy;
      float fecha=clamp((1.-c.x)/.94,0.,1.);
      float ry=q.y<0.?c.y:c.z;
      float m=1.-smoothstep(.5,1.,length(vec2(q.x/a.z,q.y/ry)));
      float lid=mix(-c.y,c.z*.35,fecha);
      float cobre=m*(1.-smoothstep(lid-1.4,lid+1.4,q.y))*step(.03,fecha);
      if(cobre>ovA){ ovA=cobre; ovC=texture2D(T,(a.xy+vec2(q.x*.6,-c.y*1.05))/S).rgb; }
      lineA=max(lineA,m*(1.-smoothstep(0.,1.8,abs(q.y-lid)))*step(.08,fecha)*.32);
    }
  }
  vec4 col=texture2D(T,(p+d)/S);
  col.rgb=mix(col.rgb,ovC,ovA)*(1.-lineA);
  gl_FragColor=col;
}`;
const GL = {};
async function initRigs() {
  for (const [id, key] of [['pT', 'T-cliente'], ['pH1', 'H-cliente'], ['pH3', 'H-gorjeta']]) {
    const cv = $(id), m = META[key];
    cv.width = m.w; cv.height = m.h;
    const img = new Image(); img.src = cv.dataset.src; await img.decode();
    const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.viewport(0, 0, m.w, m.h);
    const U = n => gl.getUniformLocation(pr, n);
    gl.uniform2f(U('S'), m.w, m.h);
    GL[id] = { gl, U: { N: U('N'), A: U('A'), B: U('B'), C: U('C'), D: U('D') }, key };
  }
}
function drawRig(id, key, t) {
  const g = GL[id]; if (!g) return;
  const { gl, U } = g;
  const ox = 900 - X0[key], oy = 520, bones = RIGS[key];
  const A = new Float32Array(64), B = new Float32Array(64), C = new Float32Array(64), D = new Float32Array(64);
  bones.forEach((bn, i) => {
    const o = i * 4;
    if (bn.blink) {
      const [cx, cy, rx, rt, rb] = bn.blink;
      A.set([cx + ox, cy + oy, rx, 1], o); B.set([0, 0, 1, 0], o); C.set([bn.k(t), rt, rb, 0], o); D.set([1, 0, 1, 1], o);
    } else {
      const [cx, cy, rx, ry] = bn.m, r = bn.at(t);
      const a = (r.a || 0) * Math.PI / 180;
      A.set([cx + ox, cy + oy, rx, ry], o); B.set([(bn.ang || 0) * Math.PI / 180, bn.f || .3, 0, 0], o);
      C.set([bn.piv[0] + ox, bn.piv[1] + oy, r.tx || 0, r.ty || 0], o); D.set([Math.cos(a), Math.sin(a), r.sx || 1, r.sy || 1], o);
    }
  });
  gl.uniform1i(U.N, bones.length);
  gl.uniform4fv(U.A, A); gl.uniform4fv(U.B, B); gl.uniform4fv(U.C, C); gl.uniform4fv(U.D, D);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
