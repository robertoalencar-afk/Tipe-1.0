/* ---------- V8: a corrida contra o tempo ----------
   A tartaruga pede a conta e espera (relógio em time-lapse), a maquininha ainda está em outra
   mesa; o bigode-wipe leva à lebre, que paga pelo celular e divide com os amigos; tela dividida:
   a tartaruga cochila no caixa enquanto a lebre já saiu feliz. Fecha com as telas reais da Tipe. */
const T = {
  AB: 4.25,             // tartaruga na mesa -> tartaruga da maquininha (fusão)
  W0: 7.0, W1: 7.8,     // bigode-wipe (a troca acontece no meio)
  DE: 10.45,            // lebre do celular -> três lebres (fusão)
  EF: 12.75,            // tela dividida abre
  PH: 15.6,             // celular com as telas reais
};
T.IRIS = T.PH + 3.25;   // assinatura
const $ = id => document.getElementById(id);

/* ---------- layout por proporção ---------- */
const L = AR === '16x9' ? {
  W: 1600, H: 900, capSize: 76, ebSize: 22, stSize: 22, gap: 20,
  ladoE: { x: 110, y: 300 }, ladoD: { x: 880, y: 300 }, centro: { y: 54 }, centroSize: 64,
  A: { k: 'T-cliente', ax: .5, ay: .56, sx: [1132, 1118], sy: [478, 478], s: [1.03, 1.12] },
  B: { k: 'T-garcom', ax: .52, ay: .6, sx: [1150, 1132], sy: [500, 500], s: [1.0, 1.09] },
  D: { k: 'H-cliente', ax: 0, ay: .5, sx: [-24, -52], sy: [452, 452], s: [1.10, 1.04] },
  E: { k: 'H-amigos', ax: .5, ay: .52, sx: [428, 452], sy: [462, 462], s: [1.09, 1.03] },
  meiaT: { x: 0, y: 0, w: 800, h: 900 }, meiaH: { x: 800, y: 0, w: 800, h: 900 }, vertical: true,
  Ft: { k: 'T-dono', ax: .5, ay: .54, sx: [400, 400], sy: [500, 500], s: [1.04, 1.12] },
  Fh: { k: 'H-gorjeta', ax: .48, ay: .54, sx: [400, 400], sy: [500, 500], s: [1.10, 1.03] },
  logo: { w: 96, right: 64, top: 58 }, bar: 5,
  phone: { cx: 1110, cy: 466, sh: 744 }, c3: { x: 110, y: 268, size: 92, stacked: true },
  endLogo: 300, endTag: 60, endGap: 46,
} : {
  W: 1080, H: 1350, capSize: 84, ebSize: 28, stSize: 27, gap: 24,
  ladoE: { x: 72, y: 140 }, ladoD: { x: 72, y: 140 }, centro: { y: 140 }, centroSize: 76,
  A: { k: 'T-cliente', ax: .5, ay: .56, sx: [540, 540], sy: [900, 900], s: [1.30, 1.40] },
  B: { k: 'T-garcom', ax: .52, ay: .62, sx: [560, 548], sy: [930, 930], s: [1.30, 1.40] },
  D: { k: 'H-cliente', ax: 0, ay: .5, sx: [-20, -44], sy: [930, 930], s: [1.20, 1.14] },
  E: { k: 'H-amigos', ax: .5, ay: .5, sx: [540, 556], sy: [930, 930], s: [1.24, 1.18] },
  meiaT: { x: 0, y: 380, w: 1080, h: 485 }, meiaH: { x: 0, y: 865, w: 1080, h: 485 }, vertical: false,
  Ft: { k: 'T-dono', ax: .5, ay: .37, sx: [540, 540], sy: [242, 242], s: [0.9, 0.97] },
  Fh: { k: 'H-gorjeta', ax: .48, ay: .55, sx: [540, 540], sy: [242, 242], s: [0.95, 0.9] },
  logo: { w: 112, right: 72, top: 70 }, bar: 6,
  phone: { cx: 540, cy: 850, sh: 800 }, c3: { x: 72, y: 150, size: 72, stacked: false },
  endLogo: 400, endTag: 84, endGap: 56,
};
const W = L.W, H = L.H;

/* ---------- easing e utilidades ---------- */
function bez(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dsx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1; let t = x;
    for (let i = 0; i < 8; i++) { const d = sx(t) - x; if (Math.abs(d) < 1e-6) break; const dd = dsx(t); if (Math.abs(dd) < 1e-6) break; t -= d / dd; }
    let lo = 0, hi = 1; for (let i = 0; i < 30 && Math.abs(sx(t) - x) > 1e-6; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
const E = bez(0.16, 1, 0.3, 1), IO = bez(0.65, 0, 0.35, 1);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const backOut = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
function show(el, o) { el.style.opacity = o; el.style.visibility = o <= 0.001 ? 'hidden' : 'visible'; }
function place(el, c, p) {
  const m = META[c.k], s = lerp(c.s[0], c.s[1], p), sx = lerp(c.sx[0], c.sx[1], p), sy = lerp(c.sy[0], c.sy[1], p);
  const tx = sx - (m.ix + c.ax * m.iw) * s, ty = sy - (m.iy + c.ay * m.ih) * s;
  el.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
}
function cam(t, a, b) { const p = P(t, a, b); return IO(p) * 0.35 + p * 0.65; }
function desfoque(el, px) { el.style.filter = px > 0.05 ? `blur(${px.toFixed(2)}px)` : 'none'; }

/* ---------- textos ---------- */
const blocos = [];
function bloco(cfg) {
  const el = document.createElement('div'); el.className = 'bloco' + (cfg.centro ? ' centro' : '');
  let h = '';
  if (cfg.eb) h += `<div class="eyebrow"><i style="background:${cfg.ebCor || 'var(--turq)'}"></i><span>${cfg.eb}</span></div>`;
  h += '<div class="cap">' + cfg.linhas.map(l => '<span style="display:block;white-space:nowrap">' + l.map(w =>
    typeof w === 'object' ? `<span class="w hl">${w.t}<span class="ul"></span></span>` : `<span class="w">${w}</span>`).join(' ') + '</span>').join('') + '</div>';
  if (cfg.st !== undefined) h += `<div class="status">${cfg.st}</div>`;
  el.innerHTML = h; $('textos').appendChild(el);
  const b = Object.assign({}, cfg, { el, ws: [...el.querySelectorAll('.w')], ul: el.querySelector('.ul'), st: el.querySelector('.status'), eb: el.querySelector('.eyebrow') });
  blocos.push(b); return b;
}
const bA = bloco({ eb: 'A tartaruga', ebCor: '#8B9686', lado: 'E', linhas: [['Pediu', 'a', 'conta'], ['e', 'ficou', 'na', 'mesa.']], st: '', de: 0.25, ate: [T.AB - 0.2, T.AB + 0.15] });
const bB = bloco({ eb: 'A tartaruga', ebCor: '#8B9686', lado: 'E', linhas: [['A', 'maquininha'], ['estava', 'na', { t: 'mesa 9.' }]], st: '', de: T.AB + 0.25, ate: [T.W0 + 0.1, T.W0 + 0.35] });
const bD = bloco({ eb: 'A lebre', lado: 'D', linhas: [['Escaneou', 'a', 'mesa'], ['e', 'pagou', { t: 'ali.' }]], st: 'Sem chamar ninguém.', de: T.W1 - 0.1, ate: [T.DE - 0.15, T.DE + 0.2] });
const bE = bloco({ eb: 'A lebre', lado: 'D', linhas: [['Dividiu', 'em', 'três'], ['sem', { t: 'calculadora.' }]], st: 'Pix, Apple Pay ou Google Pay.', de: T.DE + 0.3, ate: [T.EF - 0.1, T.EF + 0.2] });
const bF = bloco({ centro: true, linhas: AR === '16x9' ? [['Moral', 'da', 'história:'], ['quem', 'não', 'espera,', { t: 'ganha.' }]] : [['Moral', 'da', 'história:'], ['quem', 'não', 'espera,'], [{ t: 'ganha.' }]], de: T.EF + 0.45, ate: [T.PH - 0.1, T.PH + 0.2] });

function montar() {
  for (const b of blocos) {
    const cap = b.el.querySelector('.cap');
    cap.style.fontSize = (b.passo ? L.c3.size : b.centro ? L.centroSize : L.capSize) + 'px';
    if (b.eb) { b.eb.style.fontSize = L.ebSize + 'px'; b.eb.style.marginBottom = L.gap + 'px'; }
    if (b.st) { b.st.style.fontSize = L.stSize + 'px'; b.st.style.marginTop = (L.gap * 1.3) + 'px'; }
    if (b.centro) {
      b.el.style.left = '0px'; b.el.style.width = W + 'px'; b.el.style.top = L.centro.y + 'px';
      cap.classList.add('halo'); cap.style.display = 'inline-block';
    } else {
      const c = b.passo ? L.c3 : b.lado === 'E' ? L.ladoE : L.ladoD; b.el.style.left = c.x + 'px'; b.el.style.top = c.y + 'px';
    }
  }
  const lg = $('logoTop'); lg.style.width = L.logo.w + 'px'; lg.style.right = L.logo.right + 'px'; lg.style.top = L.logo.top + 'px';
  $('bar').style.height = L.bar + 'px';
  for (const [id, r] of [['mT', L.meiaT], ['mH', L.meiaH]]) Object.assign($(id).style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  const cs = $('costura').style;
  if (L.vertical) Object.assign(cs, { left: (L.meiaH.x - 3) + 'px', top: '0px', width: '6px', height: H + 'px' });
  else Object.assign(cs, { left: '0px', top: (L.meiaH.y - 3) + 'px', width: W + 'px', height: '6px' });
}
function revelar(b, t) {
  const out = b.ate, q = IO(P(t, out[0], out[1]));
  const vis = t >= b.de - 0.05 && t < out[1];
  b.el.style.visibility = vis ? 'visible' : 'hidden';
  if (!vis) return;
  if (b.eb) { const p = E(P(t, b.de - 0.15, b.de + 0.35)); b.eb.style.opacity = (p * (1 - q)).toFixed(3); }
  b.ws.forEach((w, i) => {
    const p = E(P(t, b.de + i * 0.08, b.de + i * 0.08 + 0.62));
    w.style.opacity = (p * (1 - q)).toFixed(3);
    w.style.transform = `translateY(${((1 - p) * 0.42 - q * 0.25).toFixed(3)}em)`;
    w.style.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(2)}px)` : 'none';
  });
  if (b.ul) b.ul.style.width = (E(P(t, b.de + 0.7, b.de + 1.2)) * 100).toFixed(2) + '%';
  if (b.st) { const p = E(P(t, b.de + 0.5, b.de + 0.95)); b.st.style.opacity = (p * (1 - q)).toFixed(3); b.st.style.transform = `translateY(${((1 - p) * 10).toFixed(2)}px)`; }
}

/* ---------- celular (telas reais) ---------- */
const ph = L.phone, scrH = ph.sh, scrW = Math.round(scrH * 780 / 1688), bz = Math.round(scrH * 0.017);
const devW = scrW + bz * 2, devH = scrH + bz * 2;
(function () {
  const pw = $('phoneWrap'); pw.style.width = devW + 'px'; pw.style.height = devH + 'px';
  pw.style.left = (ph.cx - devW / 2) + 'px'; pw.style.top = (ph.cy - devH / 2) + 'px';
  $('device').style.borderRadius = Math.round(devW * 0.145) + 'px';
  const s = $('screen'); s.style.left = s.style.top = bz + 'px'; s.style.width = scrW + 'px'; s.style.height = scrH + 'px';
  s.style.borderRadius = Math.round(devW * 0.145 - bz) + 'px';
  const b = $('badge'), bs = Math.round(devW * 0.2); b.style.width = b.style.height = bs + 'px';
  b.style.left = (devW - bs * 0.62) + 'px'; b.style.top = (devH * 0.16) + 'px';
  const r = $('ring'); r.style.width = r.style.height = bs + 'px'; r.style.left = b.style.left; r.style.top = b.style.top;
})();
const passos = bloco({ eb: 'Com a Tipe', lado: 'E', linhas: L.c3.stacked ? [['Confere.'], ['Escolhe.'], ['Pago.']] : [['Confere.', 'Escolhe.', 'Pago.']], de: T.PH + 0.3, ate: [T.IRIS + 0.5, T.IRIS + 0.8] });
passos.passo = true;

// assinatura
(function () {
  const lg = $('endLogo'); lg.style.width = L.endLogo + 'px';
  const lh = L.endLogo * 141 / 462, tagH = L.endTag * 1.1, top = (H - (lh + L.endGap + tagH)) / 2;
  lg.style.top = top + 'px'; lg.style.marginLeft = (-L.endLogo / 2) + 'px';
  const tg = $('endTag'); tg.style.fontSize = L.endTag + 'px'; tg.style.top = (top + lh + L.endGap) + 'px'; tg.style.lineHeight = '1.1';
})();

// bigode-wipe: três traços curvos turquesa, antecedidos pelos fios do bigode
const NS = 'http://www.w3.org/2000/svg', wipe = $('wipe');
wipe.setAttribute('viewBox', `0 0 ${W} ${H}`); wipe.setAttribute('width', W); wipe.setAttribute('height', H);
const band = H / 3 + 150, LEN = W * 2.2, BOW = H * 0.07, wstag = [0.10 * W, 0, -0.10 * W];
const strokes = ['#5ADBD2', '#0FC9BD', '#0AAEA4'].map((c, i) => {
  const p = document.createElementNS(NS, 'path'), y = H * (1 + 2 * i) / 6;
  p.setAttribute('d', `M0 ${y} C ${LEN * 0.33} ${y - BOW} ${LEN * 0.66} ${y - BOW} ${LEN} ${y}`);
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', c); p.setAttribute('stroke-width', band); p.setAttribute('stroke-linecap', 'round');
  wipe.appendChild(p); return p;
});
const hairs = [0, 1, 2].map(i => {
  const p = document.createElementNS(NS, 'path'), y = H * (0.40 + 0.1 * i);
  p.setAttribute('d', `M0 ${y} C ${W * 0.3} ${y - BOW * (1 - i * 0.5)} ${W * 0.6} ${y - BOW * (1 - i * 0.5)} ${W * 0.95} ${y + (i - 1) * H * 0.06}`);
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#0FC9BD'); p.setAttribute('stroke-width', Math.max(4, H * 0.006));
  p.setAttribute('stroke-linecap', 'round'); p.setAttribute('pathLength', '1'); p.setAttribute('stroke-dasharray', '1');
  wipe.appendChild(p); return p;
});

/* ---------- relógios ---------- */
// mesa: o ponteiro dos minutos dá ~uma volta (5 -> 47 min de espera); maquininha: continua até 1 h 04
function esperaEm(t) {
  if (t < T.AB + 0.2) { const p = clamp((t - 0.3) / 3.9); const k = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; return 5 + 42 * k; }
  return 47 + 17 * E(P(t, T.AB + 0.3, T.W0));
}
const fmtEspera = m => { m = Math.floor(m); return 'Esperando há ' + (m < 60 ? m + ' min' : '1 h ' + String(m - 60).padStart(2, '0') + ' min'); };

/* ---------- quadro(t) ---------- */
function quadro(t) {
  const swap = t >= (T.W0 + T.W1) / 2;
  // cena A: tartaruga na mesa
  const qAB = IO(P(t, T.AB, T.AB + 0.45));
  place($('pA'), L.A, cam(t, 0, T.AB + 0.45));
  show($('scA'), t < T.AB + 0.45 ? 1 : 0); desfoque($('scA'), qAB * 5);
  const m = esperaEm(t), mm = m - 5;
  $('t-minuto').setAttribute('transform', `rotate(${(Math.min(mm, 42) * 6).toFixed(3)})`);
  $('t-hora').setAttribute('transform', `rotate(${(124 + Math.min(mm, 42) * 0.5).toFixed(3)})`);
  bA.st.textContent = fmtEspera(m); bB.st.textContent = fmtEspera(m);
  // cena B: a maquininha
  place($('pB'), L.B, cam(t, T.AB, T.W1));
  show($('scB'), t >= T.AB && !swap ? qAB : 0); desfoque($('scB'), (1 - qAB) * 5);
  // cena D: lebre do celular
  const qDE = IO(P(t, T.DE, T.DE + 0.45));
  place($('pD'), L.D, E(P(t, T.W0 + 0.4, T.DE + 0.45)));
  show($('scD'), swap && t < T.DE + 0.45 ? 1 : 0); desfoque($('scD'), qDE * 5);
  // cena E: três lebres
  place($('pE'), L.E, E(P(t, T.DE, T.EF + 0.5)));
  const qEF = IO(P(t, T.EF, T.EF + 0.55));
  show($('scE'), t >= T.DE && t < T.EF + 0.55 ? qDE : 0); desfoque($('scE'), (1 - qDE) * 5);
  // cena F: tela dividida (as metades deslizam para dentro, a costura turquesa cresce)
  show($('scF'), t >= T.EF && t < T.PH + 0.4 ? 1 : 0);
  if (t >= T.EF && t < T.PH + 0.4) {
    const off = 1 - qEF;
    if (L.vertical) { $('mT').style.transform = `translateX(${(-off * L.meiaT.w).toFixed(2)}px)`; $('mH').style.transform = `translateX(${(off * L.meiaH.w).toFixed(2)}px)`; }
    else { $('mT').style.transform = `translateX(${(-off * W).toFixed(2)}px)`; $('mH').style.transform = `translateX(${(off * W).toFixed(2)}px)`; }
    const cg = E(P(t, T.EF + 0.3, T.EF + 0.8));
    $('costura').style.transform = L.vertical ? `scaleY(${cg.toFixed(4)})` : `scaleX(${cg.toFixed(4)})`;
    place($('pFt'), L.Ft, cam(t, T.EF, T.PH)); place($('pFh'), L.Fh, cam(t, T.EF, T.PH));
    const vol = 2.6 * IO(P(t, T.EF + 0.2, T.PH));        // o relógio do caixa dispara: mais duas voltas e meia
    $('d-minuto').setAttribute('transform', `rotate(${(-14 + vol * 360).toFixed(2)})`);
    $('d-hora').setAttribute('transform', `rotate(${(118 + vol * 30).toFixed(2)})`);
  }
  // textos
  blocos.forEach(b => { if (!b.passo) revelar(b, t); });
  // celular
  const pin = IO(P(t, T.PH, T.PH + 0.32));
  show($('scP'), t < T.IRIS + 0.8 ? pin : 0);
  const rise = E(P(t, T.PH + 0.1, T.PH + 1.0)), floatY = Math.sin((t - T.PH) * 1.6) * 4 * rise;
  $('phoneWrap').style.transform = `translateY(${((1 - rise) * H * 0.75 + floatY).toFixed(2)}px) rotate(${((1 - rise) * -7).toFixed(3)}deg)`;
  const n1 = T.PH + 1.2, n2 = T.PH + 2.0, nav = E(P(t, n1, n1 + 0.45)) + E(P(t, n2, n2 + 0.45));
  ['s0', 's1', 's2'].forEach((id, i) => { const x = (i - nav) * 100; $(id).style.transform = `translateX(${x.toFixed(3)}%)`; $(id).style.visibility = Math.abs(x) < 100 ? 'visible' : 'hidden'; });
  const tap = $('tap'), taps = [[n1 - 0.33, 0.48, 0.524], [n2 - 0.27, 0.5, 0.899]];
  let tapO = 0;
  for (const [tt, x, y] of taps) { const q = P(t, tt, tt + 0.42); if (q > 0 && q < 1) { const sz = lerp(scrW * 0.10, scrW * 0.24, E(q)); tap.style.width = tap.style.height = sz + 'px'; tap.style.left = (x * scrW) + 'px'; tap.style.top = (y * scrH) + 'px'; tapO = Math.sin(q * Math.PI); } }
  show(tap, tapO);
  const bp = P(t, n2 + 0.45, n2 + 0.9);
  $('badge').style.transform = `scale(${bp > 0 ? backOut(bp).toFixed(4) : 0})`; show($('badge'), bp > 0 ? 1 : 0);
  $('chk').setAttribute('stroke-dashoffset', ((1 - E(P(t, n2 + 0.63, n2 + 1.05))) * 1.1).toFixed(4));
  const rp = P(t, n2 + 0.57, n2 + 1.25);
  $('ring').style.transform = `scale(${lerp(1, 2.8, E(rp)).toFixed(4)})`; show($('ring'), rp > 0 && rp < 1 ? (1 - rp) * 0.9 : 0);
  // passos ("Conta. Pagamento. Pronto.") acendem conforme a tela
  revelar(passos, t);
  const act = t < n1 ? 0 : t < n2 ? 1 : 2;
  passos.ws.forEach((w, i) => {
    const lv = i === act ? 1 : (i < act ? lerp(1, 0.22, E(P(t, [n1, n2][i] || 0, ([n1, n2][i] || 0) + 0.3))) : 0.22);
    w.style.color = `rgba(2,30,52,${lv.toFixed(3)})`;
  });
  // barra de progresso e logo
  const bf = $('barFill');
  bf.style.background = swap ? '#0FC9BD' : 'rgba(2,30,52,.42)';
  bf.style.width = (clamp(t / T.PH) * 100).toFixed(3) + '%';
  $('bar').style.background = 'rgba(2,30,52,.08)';
  show($('bar'), 1 - IO(P(t, T.PH, T.PH + 0.3)));
  show($('logoTop'), (1 - IO(P(t, T.PH, T.PH + 0.3))) * E(P(t, 0.1, 0.8)));
  // wipe
  const wp = IO(P(t, T.W0, T.W1)), wOn = t >= T.W0 - 0.35 && t <= T.W1 + 0.05;
  wipe.style.visibility = wOn ? 'visible' : 'hidden';
  if (wOn) {
    const head = lerp(-0.12 * W, W + LEN + 0.12 * W, wp);
    strokes.forEach((p, i) => p.setAttribute('transform', `translate(${(head - LEN + wstag[i]).toFixed(2)} 0)`));
    hairs.forEach((p, i) => { const a = T.W0 - 0.35 + i * 0.05, q = E(P(t, a, a + 0.45)); p.setAttribute('stroke-dashoffset', (1 - q).toFixed(4)); p.style.opacity = (1 - P(t, T.W0 + 0.15, T.W0 + 0.3)).toFixed(3); });
  }
  // assinatura
  const end = $('end');
  if (t >= T.IRIS) {
    const bx = ph.cx + devW / 2 - devW * 0.2 * 0.12, by = ph.cy - devH / 2 + devH * 0.16 + devW * 0.1;
    const r = Math.hypot(Math.max(bx, W - bx), Math.max(by, H - by)) * IO(P(t, T.IRIS, T.IRIS + 0.55));
    const ir = $('iris'); ir.style.width = ir.style.height = (2 * r) + 'px'; ir.style.left = (bx - r) + 'px'; ir.style.top = (by - r) + 'px';
    const lp = E(P(t, T.IRIS + 0.35, T.IRIS + 0.95)); $('endLogo').style.opacity = lp; $('endLogo').style.transform = `translateY(${((1 - lp) * 18).toFixed(2)}px)`;
    [[$('tg1'), E(P(t, T.IRIS + 0.55, T.IRIS + 1.05))], [$('tg2'), E(P(t, T.IRIS + 0.72, T.IRIS + 1.22))]].forEach(([el, g]) => {
      el.style.opacity = g; el.style.transform = `translateY(${((1 - g) * 0.35).toFixed(3)}em)`; el.style.filter = g < 1 ? `blur(${((1 - g) * 8).toFixed(2)}px)` : 'none';
    });
    show(end, 1);
  } else show(end, 0);
}
