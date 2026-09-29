import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded border border-input bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
