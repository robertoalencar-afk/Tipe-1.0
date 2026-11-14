import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HareOutline } from "./HareOutline";

/** One visual language for editable AI drafts throughout the menu. */
export function LebreSuggestionButton({
  loading = false,
  loadingText = "A Lebre está pensando…",
  children = "Sugerir com a Lebre",
  className,
  disabled,
  ...props
}: Omit<ButtonProps, "variant"> & { loading?: boolean; loadingText?: string }) {
  return (
    <Button
      {...props}
      type={props.type ?? "button"}
      variant="soft"
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "h-auto min-h-11 max-w-full whitespace-normal border border-primary/20 px-4 py-2 text-left text-sm text-brand-strong hover:border-primary/50 [&_svg]:size-5",
        className,
      )}
    >
      <span aria-hidden="true" className={loading ? "motion-safe:animate-pulse" : ""}>
        <HareOutline />
      </span>
      <span>{loading ? loadingText : children}</span>
    </Button>
  );
}
