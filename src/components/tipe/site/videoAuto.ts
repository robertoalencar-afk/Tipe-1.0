/**
 * Faz um vídeo mudo tocar sozinho também no celular.
 *
 * O iPhone só deixa um vídeo tocar sem toque quando ele está mudo de verdade (atributo
 * `muted` no HTML, não só a propriedade) e com `playsinline`. No Modo Pouca Energia o
 * iOS recusa qualquer play sem gesto: aí o vídeo começa no primeiro toque em qualquer
 * lugar da página, sem a pessoa precisar achar o botão de play.
 */
export function tocarMudo(v: HTMLVideoElement, aindaQuer: () => boolean = () => true) {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  const p = v.play();
  if (!p) return;
  p.catch(() => {
    const tentar = () => {
      document.removeEventListener("touchend", tentar, true);
      document.removeEventListener("click", tentar, true);
      if (aindaQuer() && v.isConnected && v.paused) v.play().catch(() => undefined);
    };
    document.addEventListener("touchend", tentar, { capture: true, passive: true });
    document.addEventListener("click", tentar, { capture: true, passive: true });
  });
}
