/* ---------- linha do tempo da V6.1 ----------
   O motor da V6 (câmera, textos, celular, assinatura) roda no "tempo legado". A V6.1 dá mais
   tempo à tartaruga (atuação + relógio em time-lapse) e devolve a cena das três lebres
   comemorando; legado(t) converte o tempo novo no tempo do motor antigo. */
const DUR_NOVO = 18.45, T_LOOP_NOVO = 17.95;
function legado(t) {
  if (t >= T_LOOP_NOVO) return t - 3.6;          // assinatura e volta ao início
  if (t < 1.4) return t;                          // títulos no ritmo original
  if (t < 5.2) return 1.4 + (t - 1.4) * (2.5 / 3.8); // tartaruga mais longa
  if (t < 10.9) return t - 1.3;                   // wipe, lebre do celular, lebre da gorjeta
  if (t < 13.2) return 9.6;                       // as três lebres (o motor antigo espera)
  return t - 3.6;                                 // celular e assinatura
}
// relógio em time-lapse: o ponteiro dos minutos dá uma volta e um quarto (75 min) com
// aceleração e desaceleração; o das horas anda 30° por volta (0,5° por minuto), no mesmo centro.
function minutosEm(t) {
  const p = clamp((t - 0.35) / 4.4);
  const k = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  return 75 * k;
}
const ptMin = document.getElementById('t-minuto'), ptHora = document.getElementById('t-hora');
function quadro(t) {
  render(legado(t));
  const tt = t >= T_LOOP_NOVO ? 0 : t;
  const m = minutosEm(tt);
  ptMin.setAttribute('transform', `rotate(${(m * 6).toFixed(3)})`);
  ptHora.setAttribute('transform', `rotate(${(124 + m * 0.5).toFixed(3)})`);
  const espera = 5 + Math.floor(m);
  $('st1').textContent = 'Esperando a conta · há ' + (espera < 60 ? espera + ' min' : '1 h ' + String(espera - 60).padStart(2, '0') + ' min');
  amigos(t);
}
// cena das três lebres: entra com a mesma fusão desfocada usada entre as lebres
function amigos(t) {
  const sc = $('scA'); if (!sc) return;
  const q = IO(P(t, 10.6, 11.1));
  const fora = t >= 13.85;
  const c = L.H2, local = P(t, 10.6, 13.8);
  place($('pA'), 'H-amigos', lerp(c.s0, c.s1, E(local)), c.ax, c.ay, lerp(c.sx0, c.sx1, local), c.sy);
  sc.style.filter = q < 1 && q > 0 ? `blur(${((1 - q) * 16).toFixed(2)}px)` : 'none';
  show(sc, fora ? 0 : q);
  if (t >= 10.6 && t < 11.1) $('scH3').style.filter = `blur(${(q * 16).toFixed(2)}px)`;
  if (t >= 11.1 && t < 13.85) show($('scH3'), 0);
}
