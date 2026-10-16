import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Notificação "de vidro" sobre fotos, com o vocabulário real do produto. */
export function Toast({
  icon,
  title,
  text,
  className,
  style,
  tone = "light",
}: {
  icon: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  className?: string;
  style?: CSSProperties;
  tone?: "light" | "dark";
}) {
  return (
    <div
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_20px_40px_-20px_oklch(0.2_0.04_250/0.45)] backdrop-blur-xl",
        tone === "light"
          ? "border-white/60 bg-white/80 text-foreground"
          : "border-white/20 bg-[oklch(0.25_0_0/0.38)] text-white backdrop-saturate-150",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/80 text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9rem] font-medium leading-tight">{title}</span>
        {text && (
          <span
            className={cn(
              "mt-0.5 block text-xs",
              tone === "light" ? "text-muted-foreground" : "text-white/65",
            )}
          >
            {text}
          </span>
        )}
      </span>
    </div>
  );
}
