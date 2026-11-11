/* Estilo B: a corrida da conta. Linha do tempo única do GSAP, pausada (o HyperFrames busca cada quadro). */
const $ = id => document.getElementById(id);
const V = AR === '16x9';
const L = V ? {
  m: 120, c1: { eb: [120, 232], t: [120, 272, 104], r: [112, 410, 230], l: [120, 690], tart: [560, 1100, 760, 830] },
  c2: { t: [120, 104, 76], p: [[120, 300], [120, 630]], pw: 1360, ph: 150, tart: 230, lebre: 250 },
  c3: { eb: [120, 250], ps: [120, 292, 128], fone: [1010, 70, 352], lebre: [800, 880, 380] },
  c4: { t: [120, 230, 104], l: [120, 360], f: [120, 470], dir: 'row', lebre: [1240, 870, 560] },
  c5: { lebre: [800, 520, 410], eb: 590, t: [640, 104] },
  fim: { logo: 300, tag: 60, gap: 46 },
} : {
  m: 80, c1: { eb: [80, 150], t: [80, 190, 96], r: [72, 320, 210], l: [80, 560], tart: [700, 560, 300, 1300] },
  c2: { t: [80, 150, 72], p: [[80, 440], [80, 900]], pw: 840, ph: 150, tart: 250, lebre: 280 },
  c3: { eb: [80, 140], ps: [80, 180, 96], fone: [620, 470, 380], lebre: [250, 1300, 520] },
  c4: { t: [80, 170, 96], l: [80, 290], f: [80, 400], dir: 'column', lebre: [800, 1300, 640] },
  c5: { lebre: [540, 760, 560], eb: 830, t: [880, 84] },
  fim: { logo: 400, tag: 84, gap: 56 },
};
const pos = (el, x, y, fs) => { el.style.left = x + 'px'; el.style.top = y + 'px'; if (fs) el.style.fontSize = fs + 'px'; };
const sprite = (el, cx, baseY, h) => { el.style.height = h + 'px'; el.style.left = (cx) + 'px'; el.style.top = (baseY - h) + 'px'; };

// ---------- layout ----------
pos($('c1eb'), ...L.c1.eb); pos($('c1t'), ...L.c1.t); pos($('c1r'), ...L.c1.r); pos($('c1l'), ...L.c1.l);
sprite($('c1tart'), 0, L.c1.tart[3], L.c1.tart[0]);
pos($('c2t'), ...L.c2.t);
[$('p1'), $('p2')].forEach((p, i) => { pos(p, ...L.c2.p[i]); p.style.width = L.c2.pw + 'px'; });
const base1 = L.c2.p[0][1] + L.c2.ph, base2 = L.c2.p[1][1] + L.c2.ph;
sprite($('c2tart'), 0, base1 + 4, L.c2.tart); sprite($('c2lebre'), 0, base2 + 4, L.c2.lebre);
$('vel').style.top = (base2 - 120) + 'px';
pos($('c3eb'), ...L.c3.eb); pos($('c3p'), ...L.c3.ps);
const fw = L.c3.fone[2], fh = Math.round(fw * 1688 / 780) + 26;
Object.assign($('fone').style, { left: L.c3.fone[0] + 'px', top: L.c3.fone[1] + 'px', width: fw + 'px', height: fh + 'px' });
if (V) $('fone').style.top = ((H - fh) / 2 + 10) + 'px';
sprite($('c3lebre'), L.c3.lebre[0], L.c3.lebre[1], L.c3.lebre[2]);
pos($('c4t'), ...L.c4.t); pos($('c4l'), ...L.c4.l); pos($('fat'), ...L.c4.f); $('fat').style.flexDirection = L.c4.dir;
sprite($('c4lebre'), L.c4.lebre[0], L.c4.lebre[1], L.c4.lebre[2]);
sprite($('c5lebre'), 0, L.c5.lebre[1], L.c5.lebre[2]);
$('c5eb').style.cssText += `left:0;right:0;justify-content:center;top:${L.c5.eb}px`;
$('c5t').style.cssText += `left:0;right:0;top:${L.c5.t[0]}px;font-size:${L.c5.t[1]}px`;
// assinatura
const lg = $('fimLogo'); lg.style.width = L.fim.logo + 'px';
const lh = L.fim.logo * 141 / 462, topF = (H - (lh + L.fim.gap + L.fim.tag * 1.1)) / 2;
lg.style.top = topF + 'px'; lg.style.marginLeft = (-L.fim.logo / 2) + 'px';
Object.assign($('fimTag').style, { fontSize: L.fim.tag + 'px', top: (topF + lh + L.fim.gap) + 'px' });
const R = Math.hypot(W, H);
Object.assign($('iris').style, { left: (W / 2 - 5) + 'px', top: (H / 2 - 5) + 'px' });

const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
const cena = (id, a, b) => {
  tl.fromTo($(id), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45 }, a);
  if (b) tl.to($(id), { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' }, b);
};
const palavras = (sel, at, st = 0.09) => tl.fromTo(document.querySelectorAll(sel), { yPercent: 60, opacity: 0, filter: 'blur(6px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, stagger: st }, at);
const sublinha = (sel, at) => tl.to(document.querySelector(sel), { scaleX: 1, duration: 0.5, ease: 'power2.inOut' }, at);
function pontos(cont, n, cx, cy, at, raio, cores) {
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div'); d.className = 'pt'; cont.appendChild(d);
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.3, r = raio * (0.55 + ((i * 37) % 45) / 100);
    d.style.background = cores[i % cores.length]; d.style.left = cx + 'px'; d.style.top = cy + 'px';
    tl.fromTo(d, { x: 0, y: 0, scale: 0.2, opacity: 0, rotation: 0 },
      { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, scale: 1, opacity: 1, rotation: (i % 2 ? 1 : -1) * 160, duration: 0.7, ease: 'expo.out' }, at)
      .to(d, { y: '+=' + (60 + (i % 5) * 18), opacity: 0, duration: 0.9, ease: 'power1.in' }, at + 0.7);
  }
}

// ---------- 1. a espera (0 a 3,4 s) ----------
// o primeiro quadro já mostra o título e a tartaruga (vira a miniatura nos players)
Object.assign($('c1').style, { opacity: 1, visibility: 'visible' });
tl.set($('c1'), { autoAlpha: 1 }, 0);
tl.to($('c1'), { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' }, 3.3);
tl.fromTo($('c1r'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
const rel = { m: 0 };
tl.to(rel, { m: 47.2, duration: 2.6, ease: 'power2.in', onUpdate: () => {
  const mm = Math.floor(rel.m), ss = Math.floor((rel.m - mm) * 60);
  $('c1min').textContent = String(mm).padStart(2, '0'); $('c1seg').textContent = String(ss).padStart(2, '0');
} }, 0.45);
tl.fromTo($('c1l'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
// a tartaruga atravessa devagar, com passo arrastado
tl.fromTo($('c1tart'), { x: L.c1.tart[1] }, { x: L.c1.tart[2], duration: 3.3, ease: 'none' }, 0);
for (let i = 0; i < 6; i++) tl.to($('c1tart'), { y: -10, rotation: i % 2 ? 1.5 : -1.5, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1 + i * 0.52);

// ---------- 2. a corrida (3,4 a 7 s) ----------
cena('c2', 3.35, 6.95);
palavras('#c2t .w', 3.5, 0.07);
sublinha('#c2t .ul', 4.0);
tl.fromTo([$('p1'), $('p2')], { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.12 }, 3.55);
const x0 = L.c2.p[0][0] + 190, xF = L.c2.p[0][0] + L.c2.pw - 40;
tl.fromTo($('c2tart'), { x: x0 }, { x: x0 + L.c2.pw * 0.16, duration: 3.2, ease: 'none' }, 3.6);
for (let i = 0; i < 6; i++) tl.to($('c2tart'), { y: -5, duration: 0.26, ease: 'sine.out', yoyo: true, repeat: 1 }, 3.6 + i * 0.53);
// a lebre dispara aos pulos até a chegada
const lw = L.c2.lebre * 611 / 900;
tl.fromTo($('c2lebre'), { x: x0 - 40, scaleX: 1 }, { x: xF - lw, duration: 1.15, ease: 'power2.inOut' }, 4.15);
for (let i = 0; i < 5; i++) tl.to($('c2lebre'), { y: -34, duration: 0.115, ease: 'sine.out', yoyo: true, repeat: 1 }, 4.15 + i * 0.23);
tl.fromTo($('vel'), { opacity: 0, x: x0 - 40 }, { opacity: 0.9, x: xF - lw - 230, duration: 1.15, ease: 'power2.inOut' }, 4.15)
  .to($('vel'), { opacity: 0, duration: 0.25 }, 5.3);
tl.to($('c2lebre'), { rotation: -6, y: -14, duration: 0.18, ease: 'back.out(3)' }, 5.3).to($('c2lebre'), { rotation: 0, y: 0, duration: 0.3 }, 5.48);
pontos($('estouro'), 22, xF - lw / 2, base2 - L.c2.lebre * 0.55, 5.3, 150, ['#0FC9BD', '#021E34', '#7FE3DC', '#F2B84B']);
const t1 = { v: 0 }, t2 = { v: 0 };
tl.to(t1, { v: 47, duration: 3.1, ease: 'power1.in', onUpdate: () => { $('p1t').textContent = Math.round(t1.v) + ' min'; } }, 3.7);
tl.to(t2, { v: 8, duration: 1.15, ease: 'none', onUpdate: () => { $('p2t').textContent = Math.round(t2.v) + ' s'; } }, 4.15);
tl.fromTo($('p2t'), { scale: 1 }, { scale: 1.25, duration: 0.18, ease: 'back.out(3)', transformOrigin: '100% 50%' }, 5.3).to($('p2t'), { scale: 1, duration: 0.3 }, 5.5);

// ---------- 3. o celular (7 a 11,6 s) ----------
cena('c3', 7.0, 11.55);
tl.fromTo($('c3eb'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.5 }, 7.1);
tl.fromTo($('fone'), { y: 80, rotation: 4, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, 7.05);
tl.fromTo($('c3lebre'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.6)' }, 7.35);
tl.fromTo('#c3p .p', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1 }, 7.2);
const passo = (id, at) => {
  tl.to('#c3p .p', { color: '#C9C2B6', duration: 0.25 }, at);
  tl.to(document.querySelector(id), { color: '#021E34', duration: 0.3 }, at);
};
const toque = (x, y, at) => {
  tl.set($('toque'), { left: x * fw + 'px', top: y * (fh - 26) + 'px' }, at)
    .fromTo($('toque'), { scale: 0.3, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.5, ease: 'power2.out' }, at);
};
tl.set([$('t1'), $('t2')], { opacity: 0 }, 0);
passo('#s1', 7.6);
toque(0.48, 0.524, 8.55); tl.to($('t1'), { opacity: 1, duration: 0.3, ease: 'none' }, 8.8); passo('#s2', 8.8);
toque(0.5, 0.899, 9.95); tl.to($('t2'), { opacity: 1, duration: 0.3, ease: 'none' }, 10.2); passo('#s3', 10.2);
tl.to($('fone'), { y: -8, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 10.25);
tl.to($('c3lebre'), { y: -16, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 10.35);

// ---------- 4. dividir (11,6 a 14,2 s) ----------
cena('c4', 11.6, 14.15);
palavras('#c4t .w', 11.7);
tl.fromTo($('c4l'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 11.7);
tl.fromTo('#fat .fatia', { opacity: 0, y: 40, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.16, ease: 'back.out(1.7)' }, 12.35);
tl.fromTo($('c4lebre'), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6 }, 11.85);
tl.to($('c4lebre'), { rotation: -4, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 3, transformOrigin: '50% 100%' }, 12.6);

// ---------- 5. moral (14,2 a 16,9 s) ----------
cena('c5', 14.2, null);
tl.fromTo($('c5lebre'), { x: W / 2 - L.c5.lebre[2] * 519 / 900 / 2, y: 80, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' }, 14.25);
tl.to($('c5lebre'), { y: -26, duration: 0.22, ease: 'sine.out', yoyo: true, repeat: 3 }, 14.95);
pontos($('confete'), 34, W / 2, L.c5.lebre[1] - L.c5.lebre[2] * 0.75, 14.9, V ? 330 : 380, ['#0FC9BD', '#021E34', '#7FE3DC', '#F2B84B', '#E8846B']);
tl.fromTo($('c5eb'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 14.75);
palavras('#c5t .w', 14.9, 0.1);
sublinha('#c5t .ul', 15.55);

// ---------- 6. assinatura (16,9 a 19 s) ----------
tl.set($('fim'), { visibility: 'visible' }, 16.9);
tl.fromTo($('iris'), { scale: 0 }, { scale: R / 5 + 2, duration: 0.6, ease: 'power2.in' }, 16.9);
tl.to($('c5'), { autoAlpha: 0, duration: 0.2 }, 17.35);
tl.to([$('logoTop'), $('barra')], { opacity: 0, duration: 0.3 }, 16.9);
tl.fromTo(lg, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, 17.3);
tl.fromTo([$('g1'), $('g2')], { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.17 }, 17.55);
// barra de progresso e logo do topo
tl.fromTo($('barraF'), { width: '0%' }, { width: '100%', duration: 16.9, ease: 'none' }, 0);
tl.set({}, {}, DUR);
