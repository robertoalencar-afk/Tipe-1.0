/* ---------- personagens articulados (GSAP), V8 ----------
   Cada parte é um recorte da ilustração oficial que gira no seu pivô anatômico. Nada é
   esticado: rotação e poucos pixels de deslocamento. Tempos em segundos do vídeo. */
const q = id => document.getElementById(id);
document.querySelectorAll('.parte').forEach(el => gsap.set(el, { transformOrigin: el.style.transformOrigin }));
const R = (id, v, d, at, ease) => tl.to(q(id), Object.assign({ duration: d, ease: ease || 'sine.inOut' }, v), at);
function piscar(ids, at, lento) {
  const k = lento ? 2.6 : 1;
  ids.forEach(id => {
    const img = q(id + '-pele'), arco = q(id + '-arco'), hh = RIGH[id];
    tl.to(img, { y: hh, duration: 0.075 * k, ease: 'power2.in' }, at)
      .to(img, { y: 0, duration: 0.13 * k, ease: 'power2.out' }, at + (0.075 + 0.05) * k);
    if (arco) tl.to(arco, { opacity: 1, duration: 0.02, ease: 'none' }, at + 0.07 * k)
      .to(arco, { opacity: 0, duration: 0.03, ease: 'none' }, at + (0.075 + 0.05) * k + 0.02);
  });
}
function respirar(id, de, ate, per, amp) {
  const n = Math.max(1, Math.floor((ate - de) / per));
  tl.fromTo(q(id), { y: 0 }, { y: -amp, duration: per / 2, ease: 'sine.inOut', yoyo: true, repeat: n * 2 - 1 }, de);
}
// a cabeça lidera; as orelhas (filhas da cabeça) ficam para trás e assentam depois
function cabeca(id, orelhas, de, para, at, dur, ease) {
  R(id, { rotation: para }, dur, at, ease || 'power2.inOut');
  const arrasto = -(para - de) * 0.55;
  orelhas.forEach((o, i) => {
    const a = at + 0.03 + i * 0.05;
    tl.to(q(o), { rotation: arrasto, duration: dur * 0.6, ease: 'sine.out' }, a)
      .to(q(o), { rotation: -arrasto * 0.25, duration: dur * 0.55, ease: 'sine.inOut' }, a + dur * 0.6)
      .to(q(o), { rotation: 0, duration: dur * 0.5, ease: 'sine.out' }, a + dur * 1.15);
  });
}
function pop(id, at, origem, sobe) {
  tl.set(q(id), { scale: 0.3, opacity: 0, transformOrigin: origem }, 0);
  tl.to(q(id), { opacity: 1, duration: 0.12, ease: 'none' }, at)
    .to(q(id), { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, at)
    .to(q(id), { y: -sobe, duration: 1.4, ease: 'sine.out' }, at + 0.45);
}

/* --- A (0 a 4,7 s): tartaruga olha o relógio, bate a mão, apoia o queixo, suspira --- */
respirar('t-cabeca', 0.0, 4.6, 3.2, 1.0);
R('t-cabeca', { rotation: 2.2, x: 1.5, y: -1.5 }, 0.7, 0.25);
piscar(['t-olhoE', 't-olhoD'], 1.0, true);
R('t-mao', { rotation: 3.5 }, 0.16, 0.55, 'power2.out');
R('t-mao', { rotation: -1 }, 0.2, 0.71, 'power2.in');
R('t-mao', { rotation: 3 }, 0.16, 0.95, 'power2.out');
R('t-mao', { rotation: 0 }, 0.25, 1.11, 'power2.in');
R('t-braco', { rotation: 0.8 }, 0.18, 1.45, 'sine.out');
R('t-braco', { rotation: -4.2 }, 0.95, 1.63, 'power2.inOut');
R('t-mao', { rotation: -3 }, 0.9, 1.75, 'power2.inOut');
R('t-cabeca', { rotation: 2.6, x: 0, y: 1.6 }, 0.9, 2.15, 'power2.inOut');
R('t-cabeca', { rotation: 2.0 }, 0.5, 2.95);
R('t-cabeca', { rotation: 2.3, y: 0.6 }, 0.4, 3.45, 'sine.out');
R('t-cabeca', { rotation: 3.0, y: 1.8 }, 0.7, 3.85, 'sine.inOut');
R('t-braco', { rotation: -4.6 }, 0.7, 3.9, 'sine.inOut');
piscar(['t-olhoE', 't-olhoD'], 3.95, true);

/* --- B (4,25 a 7,4 s): a tartaruga garçom com a maquininha, cansada; o salão chama --- */
// passo arrastado no lugar: o corpo sobe/desce e balança a partir dos pés
const passo = 0.62;
for (let i = 0; i < 5; i++) {
  const a = 4.3 + i * passo, lado = i % 2 ? 1 : -1;
  tl.to(q('g-tart'), { y: -5, rotation: 1.1 * lado, duration: passo * 0.45, ease: 'sine.out' }, a)
    .to(q('g-tart'), { y: 0, rotation: 0.4 * lado, duration: passo * 0.55, ease: 'sine.in' }, a + passo * 0.45);
}
// braços do fundo pedindo a conta: cada um acena no seu ritmo, girando no ombro escondido atrás da mesa
[['g-bracoA', 7, 0.0, 0.34], ['g-bracoB', -6, 0.17, 0.4], ['g-bracoC', 6, 0.08, 0.37], ['g-bracoD', -7, 0.25, 0.31]].forEach(([id, ang, fase, per]) => {
  const n = Math.floor((7.4 - 4.3 - fase) / per);
  tl.fromTo(q(id), { rotation: -ang * 0.4 }, { rotation: ang, duration: per, ease: 'sine.inOut', yoyo: true, repeat: n - 1 }, 4.3 + fase);
});

/* --- D (7,4 a 10,9 s): a lebre paga pelo celular, rápida e confiante --- */
const dD = 2.1;
respirar('h1-cabeca', 5.6 + dD, 9.4 + dD + 0.6, 2.2, 0.9);
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], 0, -2.2, 5.85 + dD, 0.5);
R('h1-braco', { rotation: 1.6 }, 0.34, 6.04 + dD, 'power2.out');
R('h1-braco', { rotation: 0.9 }, 0.09, 6.42 + dD, 'power2.in');
R('h1-braco', { rotation: 1.6 }, 0.28, 6.51 + dD, 'back.out(2)');
tl.set(q('h1-bolha'), { scale: 0.35, opacity: 0, transformOrigin: '50% 80%' }, 0);
tl.to(q('h1-bolha'), { opacity: 1, duration: 0.14, ease: 'none' }, 6.54 + dD)
  .to(q('h1-bolha'), { scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, 6.54 + dD)
  .to(q('h1-bolha'), { y: -5, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 7.1 + dD);
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], -2.2, -0.6, 6.66 + dD, 0.16, 'power2.in');
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], -0.6, -1.8, 6.82 + dD, 0.4, 'back.out(1.5)');
piscar(['h1-olhoE', 'h1-olhoD'], 7.25 + dD);
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], -1.8, 0.5, 7.85 + dD, 0.8);
R('h1-braco', { rotation: 0.4 }, 0.9, 7.95 + dD);

/* --- E (10,45 a 13,3 s): as três lebres dividem a conta e brindam --- */
const dE = -0.15;
const OA1 = ['a1-orelhaE', 'a1-orelhaD'], OA2 = ['a2-orelhaE', 'a2-orelhaD'], OA3 = ['a3-orelhaE', 'a3-orelhaD'];
respirar('a1-cabeca', 10.6 + dE, 13.3, 2.0, 0.8);
respirar('a3-cabeca', 10.75 + dE, 13.3, 2.3, 0.8);
cabeca('a2-cabeca', OA2, 0, 2.4, 11.0 + dE, 0.32, 'power2.out');
cabeca('a2-cabeca', OA2, 2.4, -1.6, 11.32 + dE, 0.36, 'power2.inOut');
cabeca('a2-cabeca', OA2, -1.6, 1.8, 11.68 + dE, 0.34, 'power2.inOut');
cabeca('a2-cabeca', OA2, 1.8, 0, 12.02 + dE, 0.6, 'back.out(1.6)');
cabeca('a1-cabeca', OA1, 0, 3.2, 11.12 + dE, 0.55);
cabeca('a1-cabeca', OA1, 3.2, 0.6, 12.2 + dE, 0.7);
cabeca('a3-cabeca', OA3, 0, -3.0, 11.26 + dE, 0.55);
cabeca('a3-cabeca', OA3, -3.0, -0.4, 12.3 + dE, 0.7);
pop('a-bolhaP', 11.2 + dE, '30% 100%', 5);
pop('a-bolhaR', 11.48 + dE, '30% 100%', 5);

/* --- F (12,75 a 16 s): tela dividida. A tartaruga cochila no caixa; a lebre sai contente --- */
// cochilo: a cabeça pende devagar, dá um tranco ao acordar e volta a pender
R('d-cabeca', { rotation: 2.6, y: 2 }, 1.3, 12.9, 'sine.inOut');
R('d-cabeca', { rotation: -1.2, y: -2 }, 0.16, 14.3, 'power3.out');
R('d-cabeca', { rotation: 2.2, y: 1.5 }, 1.2, 14.55, 'sine.inOut');
respirar('h3-cabeca', 12.8, 15.9, 2.4, 0.9);
tl.set(q('h3-coracao'), { scale: 0.3, opacity: 0, transformOrigin: '40% 100%' }, 0);
tl.to(q('h3-coracao'), { opacity: 1, duration: 0.12, ease: 'none' }, 13.4)
  .to(q('h3-coracao'), { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, 13.4)
  .to(q('h3-coracao'), { y: -7, duration: 1.5, ease: 'sine.out' }, 13.65)
  .to(q('h3-coracao'), { scale: 1.08, duration: 0.11, ease: 'power2.out' }, 14.15)
  .to(q('h3-coracao'), { scale: 1, duration: 0.18, ease: 'power2.in' }, 14.26)
  .to(q('h3-coracao'), { scale: 1.05, duration: 0.1, ease: 'power2.out' }, 14.45)
  .to(q('h3-coracao'), { scale: 1, duration: 0.2, ease: 'power2.in' }, 14.55);
cabeca('h3-cabeca', ['h3-orelhaE', 'h3-orelhaD'], 0, 2.6, 13.15, 0.7);
cabeca('h3-cabeca', ['h3-orelhaE', 'h3-orelhaD'], 2.6, -1.0, 13.95, 0.85);
cabeca('h3-cabeca', ['h3-orelhaE', 'h3-orelhaD'], -1.0, 1.4, 14.9, 0.7);
