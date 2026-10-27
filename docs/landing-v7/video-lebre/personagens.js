/* ---------- personagens articulados (GSAP), V6.1 ----------
   Cada parte é um recorte da ilustração original que gira no seu pivô anatômico
   (transform-origin vindo de partes.py): pescoço, base da orelha, cotovelo, punho. Na V7 os
   pivôs não eram aplicados (o GSAP girava cada parte pelo centro), e por isso a orelha
   parecia subir "de baixo para cima". Nada é esticado: só rotação e poucos pixels de
   deslocamento. Piscada = pálpebra que desce sobre o olho. Tempos em segundos do vídeo. */
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
// respiração: a cabeça sobe e desce ~1 px (repetição finita, determinística)
function respirar(id, de, ate, per, amp) {
  const n = Math.max(1, Math.floor((ate - de) / per));
  tl.fromTo(q(id), { y: 0 }, { y: -amp, duration: per / 2, ease: 'sine.inOut', yoyo: true, repeat: n * 2 - 1 }, de);
}
// gesto de cabeça com as orelhas "atrasadas": a cabeça lidera; as orelhas (filhas da cabeça)
// ficam um pouco para trás e assentam depois, sempre girando a partir da base
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

/* --- CENA 1, tartaruga (0 a 5,6 s): olha o relógio, apoia o queixo na mão, suspira --- */
respirar('t-cabeca', 0.0, 5.4, 3.2, 1.0);
// 1) olha para o relógio: a cabeça vira um pouco e sobe
R('t-cabeca', { rotation: 2.2, x: 1.5, y: -1.5 }, 0.7, 0.25);
piscar(['t-olhoE', 't-olhoD'], 1.0, true);
// 2) impaciência: a mão bate de leve no ar duas vezes (punho)
R('t-mao', { rotation: 5 }, 0.16, 0.55, 'power2.out');
R('t-mao', { rotation: -1 }, 0.2, 0.71, 'power2.in');
R('t-mao', { rotation: 4 }, 0.16, 0.95, 'power2.out');
R('t-mao', { rotation: 0 }, 0.25, 1.11, 'power2.in');
// 3) leva a mão ao queixo: antecipação curta, o antebraço gira no cotovelo apoiado na mesa,
//    o punho dobra para a palma ficar sob o queixo; a cabeça desce e repousa na mão
R('t-braco', { rotation: 0.8 }, 0.18, 1.45, 'sine.out');
R('t-braco', { rotation: -12.5 }, 0.95, 1.63, 'power2.inOut');
R('t-mao', { rotation: -7 }, 0.9, 1.75, 'power2.inOut');
R('t-cabeca', { rotation: 4.6, x: 0, y: 2.2 }, 0.9, 2.15, 'power2.inOut');
// 4) olha para os lados sem tirar o queixo da mão
R('t-cabeca', { rotation: 3.4 }, 0.55, 3.1);
R('t-cabeca', { rotation: 5.2 }, 0.6, 3.65);
// 5) suspiro: a cabeça sobe um pouco (inspira) e cai devagar (expira); pisca lento, frustrada
R('t-cabeca', { rotation: 3.8, y: 0.6 }, 0.45, 4.25, 'sine.out');
R('t-cabeca', { rotation: 5.4, y: 2.8 }, 0.8, 4.7, 'sine.inOut');
R('t-braco', { rotation: -13.2 }, 0.8, 4.75, 'sine.inOut');
piscar(['t-olhoE', 't-olhoD'], 4.85, true);
// na volta ao início (17,95 s) a tartaruga reaparece em repouso
tl.set(q('t-cabeca'), { rotation: 0, x: 0, y: 0 }, 17.9);

/* --- as três lebres comemorando (10,6 a 13,85 s): conta dividida e paga, brindam juntas --- */
const OA1 = ['a1-orelhaE', 'a1-orelhaD'], OA2 = ['a2-orelhaE', 'a2-orelhaD'], OA3 = ['a3-orelhaE', 'a3-orelhaD'];
respirar('a1-cabeca', 10.6, 13.85, 2.0, 0.8);
respirar('a3-cabeca', 10.75, 13.85, 2.3, 0.8);
// a do meio ri: dois acenos rápidos, as das pontas inclinam para ela, cada uma no seu tempo
cabeca('a2-cabeca', OA2, 0, 2.4, 11.0, 0.32, 'power2.out');
cabeca('a2-cabeca', OA2, 2.4, -1.6, 11.32, 0.36, 'power2.inOut');
cabeca('a2-cabeca', OA2, -1.6, 1.8, 11.68, 0.34, 'power2.inOut');
cabeca('a2-cabeca', OA2, 1.8, 0, 12.02, 0.6, 'back.out(1.6)');
cabeca('a1-cabeca', OA1, 0, 3.2, 11.12, 0.55);
cabeca('a1-cabeca', OA1, 3.2, 0.6, 12.35, 0.8);
cabeca('a3-cabeca', OA3, 0, -3.0, 11.26, 0.55);
cabeca('a3-cabeca', OA3, -3.0, -0.4, 12.5, 0.8);
// os balões (pessoa e cifrão) aparecem com um pop, um depois do outro
['a-bolhaP', 'a-bolhaR'].forEach((b, i) => {
  const at = 11.2 + i * 0.28;
  tl.set(q(b), { scale: 0.3, opacity: 0, transformOrigin: '30% 100%' }, 0);
  tl.to(q(b), { opacity: 1, duration: 0.1, ease: 'none' }, at)
    .to(q(b), { scale: 1, duration: 0.42, ease: 'back.out(2.4)' }, at)
    .to(q(b), { y: -5, duration: 1.4, ease: 'sine.out' }, at + 0.45);
});

tl.set(q('t-braco'), { rotation: 0 }, 17.9);
tl.set(q('t-mao'), { rotation: 0 }, 17.9);

/* --- CENA 2, lebre do celular (5,6 a 9,4 s): rápida, confiante --- */
respirar('h1-cabeca', 5.6, 9.4, 2.2, 0.9);
// entra olhando o celular: a cabeça inclina para o aparelho, orelhas acompanham com atraso
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], 0, -2.2, 5.85, 0.5);
R('h1-braco', { rotation: 1.6 }, 0.34, 6.04, 'power2.out');
// toque de confirmar: o celular afunda um nadinha e volta
R('h1-braco', { rotation: 0.9 }, 0.09, 6.42, 'power2.in');
R('h1-braco', { rotation: 1.6 }, 0.28, 6.51, 'back.out(2)');
// aprovado: o balão nasce do celular
tl.set(q('h1-bolha'), { scale: 0.35, opacity: 0, transformOrigin: '50% 80%' }, 0);
tl.to(q('h1-bolha'), { opacity: 1, duration: 0.14, ease: 'none' }, 6.54)
  .to(q('h1-bolha'), { scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, 6.54)
  .to(q('h1-bolha'), { y: -5, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 7.1);
// satisfeita: aceno de cabeça curto e piscada
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], -2.2, -0.6, 6.66, 0.16, 'power2.in');
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], -0.6, -1.8, 6.82, 0.4, 'back.out(1.5)');
piscar(['h1-olhoE', 'h1-olhoD'], 7.25);
// relaxa e olha para a frente
cabeca('h1-cabeca', ['h1-orelhaE', 'h1-orelhaD'], -1.8, 0.5, 7.85, 0.8);
R('h1-braco', { rotation: 0.4 }, 0.9, 7.95);
piscar(['h1-olhoE', 'h1-olhoD'], 8.75);

/* --- lebre da gorjeta (8,9 a 11,1 s): contente --- */
respirar('h3-cabeca', 8.9, 11.1, 2.4, 0.9);
tl.set(q('h3-coracao'), { scale: 0.3, opacity: 0, transformOrigin: '40% 100%' }, 0);
tl.to(q('h3-coracao'), { opacity: 1, duration: 0.12, ease: 'none' }, 9.4)
  .to(q('h3-coracao'), { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, 9.4)
  .to(q('h3-coracao'), { y: -7, duration: 1.5, ease: 'sine.out' }, 9.65)
  .to(q('h3-coracao'), { scale: 1.08, duration: 0.11, ease: 'power2.out' }, 10.15)
  .to(q('h3-coracao'), { scale: 1, duration: 0.18, ease: 'power2.in' }, 10.26)
  .to(q('h3-coracao'), { scale: 1.05, duration: 0.1, ease: 'power2.out' }, 10.45)
  .to(q('h3-coracao'), { scale: 1, duration: 0.2, ease: 'power2.in' }, 10.55);
cabeca('h3-cabeca', ['h3-orelhaE', 'h3-orelhaD'], 0, 2.6, 9.15, 0.7);
cabeca('h3-cabeca', ['h3-orelhaE', 'h3-orelhaD'], 2.6, -1.0, 9.95, 0.85);
