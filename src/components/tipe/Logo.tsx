export function TipeSymbol({ className = "h-8 w-8" }: { className?: string }) {
  // "Y" minimalista com pontas sugerindo orelhas de lebre
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M14 6c0 10 4 16 10 20M34 6c0 10-4 16-10 20M24 26v16" fill="none" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function TipeLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TipeSymbol />
      <span className="font-display text-2xl font-extrabold tracking-[0.2em]">TIPE</span>
    </div>
  );
}
