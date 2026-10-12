// Aviso sonoro curto sem arquivo de áudio (KDS e painel de senhas).
// Navegadores só liberam som depois de um toque na tela; por isso o contexto é
// criado no primeiro clique em "Ativar som" e reaproveitado depois.
let ctx: AudioContext | null = null;

export function unlockSound(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx ??= new Ctor();
    void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** Toca 1 a 3 bipes. `tone` "chamada" é mais grave e longo, para a TV de senhas. */
export function beep(times = 1, tone: "pedido" | "chamada" = "pedido") {
  if (!ctx) return;
  try {
    const freq = tone === "chamada" ? 660 : 880;
    const dur = tone === "chamada" ? 0.35 : 0.15;
    for (let i = 0; i < times; i++) {
      const start = ctx.currentTime + i * (dur + 0.12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }
  } catch {
    /* som é um extra: nunca derruba a tela */
  }
}
