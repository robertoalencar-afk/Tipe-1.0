import { useEffect, useRef, useState } from "react";

const BARS = 28;

/** Live recording indicator: elapsed time plus a waveform driven by the mic level. */
export function VoiceWave({ stream }: { stream: MediaStream }) {
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  const [seconds, setSeconds] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 70) return;
      last = t;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4.5);
      setLevels((prev) => [...prev.slice(1), Math.max(0.08, level)]);
      setSeconds(Math.floor((Date.now() - started.current) / 1000));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); void ctx.close(); };
  }, [stream]);

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" aria-live="polite" aria-label={`Gravando ${time}`}>
      <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" /></span>
      <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-foreground">{time}</span>
      <div className="flex h-6 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
        {levels.map((l, i) => (
          <span key={i} className="w-[3px] shrink-0 rounded-full bg-primary transition-[height] duration-75" style={{ height: `${Math.round(l * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}
