/** Compact line icon of the TIPE hare, inheriting the surrounding theme color. */
export function HareOutline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} role="img" aria-label="Lebre TIPE">
      <path d="M12 19C8 13 7 3 10 2c3-1 5 9 5 15M18 17c0-6 2-16 5-15 3 1 2 11-2 17" />
      <path d="M10 19c-3 2-5 5-5 9 0 6 5 10 11 10s11-4 11-10c0-4-2-7-5-9" />
      <path d="M11 26h.01M21 26h.01M14 30l2 2 2-2M16 32v2m-4 0c1 2 3 2 4 0 1 2 3 2 4 0M5 29l-3-1m3 4-3 1m25-4 3-1m-3 4 3 1" />
    </svg>
  );
}