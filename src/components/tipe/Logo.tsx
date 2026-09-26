import logo from "@/assets/logo.png.asset.json";
import logoDark from "@/assets/logo-dark.png.asset.json";

export function TipeSymbol({ className = "h-8 w-8" }: { className?: string }) {
  // "Y" minimalista com pontas sugerindo orelhas de lebre
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M14 6c0 10 4 16 10 20M34 6c0 10-4 16-10 20M24 26v16" fill="none" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function TipeLogo({ className = "", variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  // "light" = texto branco (fundos escuros); "dark" = texto azul-marinho (fundos claros)
  const src = variant === "dark" ? logoDark.url : logo.url;
  return (
    <img src={src} alt="TIPE" className={`h-12 w-auto object-contain ${className}`} />
  );
}
