/* ---------- personagens articulados (GSAP) ----------
   Cada parte é um recorte da ilustração original com o seu próprio pivô (pescoço, base da
   orelha, cotovelo, ombro). Nada é esticado: as partes só giram e se deslocam alguns pixels,
   como um boneco articulado. A piscada é uma pálpebra que desce sobre o olho (recortada da
   pele logo acima), não um achatamento do olho. Tempos em segundos do vídeo. */
const q = id => document.getElementById(id);
const R = (id, v, d, at, ease) => tl.to(q(id), Object.assign({ duration: d, ease: ease || 'sine.inOut' }, v), at);
const S = (id, v, at) => tl.set(q(id), v, at);
// piscada: fecha rápido, segura, abre um pouco mais devagar
function piscar(ids, at, h, lento) {
  const k = lento ? 2.6 : 1;
  ids.forEach((id, i) => {
    const img = q(id + '-pele'), arco = q(id + '-arco'), hh = h[i];
    tl.to(img, { y: hh, duration: 0.075 * k, ease: 'power2.in' }, at)
      .to(img, { y: 0, duration: 0.13 * k, ease: 'power2.out' }, at + (0.075 + 0.05) * k);
    if (arco) tl.to(arco, { opacity: 1, duration: 0.02, ease: 'none' }, at + 0.07 * k)
      .to(arco, { opacity: 0, duration: 0.03, ease: 'none' }, at + (0.075 + 0.05) * k + 0.02);
  });
}
// respiração: sobe e desce o tronco (aqui, só a cabeça acompanha) com repetição finita
function respirar(id, de, ate, per, amp) {
  const n = Math.max(1, Math.floor((ate - de) / per));
  tl.fromTo(q(id), { y: 0 }, { y: -amp, duration: per / 2, ease: 'sine.inOut', yoyo: true, repeat: n * 2 - 1 }, de);
}
// "batida" amortecida de orelha: vai, passa do ponto e assenta
function orelha(id, at, ang) {
  tl.to(q(id), { rotation: ang, duration: 0.16, ease: 'power2.out' }, at)
    .to(q(id), { rotation: -ang * 0.35, duration: 0.22, ease: 'sine.inOut' }, at + 0.16)
    .to(q(id), { rotation: 0, duration: 0.34, ease: 'sine.out' }, at + 0.38);
}

/* --- tartaruga (0 a 4,7 s): cansada, tudo devagar --- */
respirar('t-cabeca', 0.0, 3.9, 3.0, 1.2);
// a mão chama o garçom: um aceno curto, que perde força
R('t-braco', { rotation: -2.4 }, 0.45, 0.25, 'sine.out');
R('t-braco', { rotation: 1.2 }, 0.55, 0.70);
R('t-braco', { rotation: -0.8 }, 0.55, 1.25);
R('t-braco', { rotation: 0.6 }, 0.6, 1.80);
// a cabeça cai num suspiro (lidera) e o braço desaba logo depois (segue)
R('t-cabeca', { rotation: 2.6 }, 1.25, 1.55);
R('t-braco', { rotation: 2.2 }, 1.1, 2.45);
R('t-cabeca', { rotation: 1.2 }, 1.1, 3.0);
piscar(['t-olhoE', 't-olhoD'], 1.05, [RIGH['t-olhoE'], RIGH['t-olhoD']], true);
piscar(['t-olhoE', 't-olhoD'], 3.25, [RIGH['t-olhoE'], RIGH['t-olhoD']], true);
// o ponteiro dos minutos avança a cada minuto de espera (junto com o contador do texto)
[1.7, 2.5, 3.3].forEach((at, i) => tl.to(q('t-minuto'), { rotation: 6 * (i + 1), duration: 0.22, ease: 'back.out(3)' }, at));

/* --- lebre do celular (4,3 a 8,1 s): ágil, gestos curtos com antecipação --- */
respirar('h1-cabeca', 4.3, 8.1, 2.2, 1.0);
// entra com as orelhas em pé: um leve recuo e o salto, a direita atrasada
orelha('h1-orelhaE', 4.55, -4.5);
orelha('h1-orelhaD', 4.62, 4.5);
// olha para o celular (cabeça) e o braço levanta o aparelho em seguida
R('h1-cabeca', { rotation: -2.4 }, 0.55, 4.55, 'power2.out');
R('h1-braco', { rotation: 1.8 }, 0.36, 4.74, 'power2.out');
// toque de confirmar: o celular afunda um nadinha e volta
R('h1-braco', { rotation: 1.0 }, 0.09, 5.12, 'power2.in');
R('h1-braco', { rotation: 1.8 }, 0.28, 5.21, 'back.out(2)');
// o balão de aprovado nasce do celular
S('h1-bolha', { scale: 0.35, opacity: 0, transformOrigin: '50% 80%' }, 0);
tl.to(q('h1-bolha'), { opacity: 1, duration: 0.14, ease: 'none' }, 5.24)
  .to(q('h1-bolha'), { scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, 5.24)
  .to(q('h1-bolha'), { y: -5, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 5.8);
// aceno de "deu certo": cabeça desce e volta, orelhas acompanham com atraso
R('h1-cabeca', { rotation: -0.6 }, 0.14, 5.36, 'power2.in');
R('h1-cabeca', { rotation: -2.0 }, 0.4, 5.5, 'back.out(1.6)');
orelha('h1-orelhaE', 5.46, -2.6);
orelha('h1-orelhaD', 5.52, 2.6);
piscar(['h1-olhoE', 'h1-olhoD'], 5.9, [RIGH['h1-olhoE'], RIGH['h1-olhoD']]);
// relaxa e olha para a frente
R('h1-cabeca', { rotation: 0.6 }, 0.9, 6.55);
R('h1-braco', { rotation: 0.4 }, 1.0, 6.7);
orelha('h1-orelhaD', 6.9, 3.2);
piscar(['h1-olhoE', 'h1-olhoD'], 7.25, [RIGH['h1-olhoE'], RIGH['h1-olhoD']]);

/* --- lebre da gorjeta (7,6 a 10,3 s): contente, balança a cabeça --- */
respirar('h3-cabeca', 7.6, 10.3, 2.4, 1.0);
S('h3-coracao', { scale: 0.3, opacity: 0, transformOrigin: '40% 100%' }, 0);
tl.to(q('h3-coracao'), { opacity: 1, duration: 0.12, ease: 'none' }, 8.15)
  .to(q('h3-coracao'), { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, 8.15)
  .to(q('h3-coracao'), { y: -7, duration: 1.6, ease: 'sine.out' }, 8.4)
  .to(q('h3-coracao'), { scale: 1.09, duration: 0.11, ease: 'power2.out' }, 8.95)
  .to(q('h3-coracao'), { scale: 1, duration: 0.18, ease: 'power2.in' }, 9.06)
  .to(q('h3-coracao'), { scale: 1.06, duration: 0.1, ease: 'power2.out' }, 9.27)
  .to(q('h3-coracao'), { scale: 1, duration: 0.2, ease: 'power2.in' }, 9.37);
R('h3-cabeca', { rotation: 3.0 }, 0.7, 7.95, 'sine.inOut');
orelha('h3-orelhaE', 8.05, -3.6);
orelha('h3-orelhaD', 8.12, -3.0);
R('h3-cabeca', { rotation: -1.2 }, 0.9, 8.75, 'sine.inOut');
orelha('h3-orelhaE', 8.85, 2.8);
orelha('h3-orelhaD', 8.92, 3.4);
R('h3-cabeca', { rotation: 0.8 }, 0.8, 9.65, 'sine.inOut');

/* na volta ao início (14,35 s) a tartaruga reaparece em repouso */
tl.set(q('t-minuto'), { rotation: 0 }, 14.3);
tl.set(q('t-cabeca'), { rotation: 0, y: 0 }, 14.3);
tl.set(q('t-braco'), { rotation: 0 }, 14.3);
