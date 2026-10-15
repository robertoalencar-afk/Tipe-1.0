import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-focus-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
