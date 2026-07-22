import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-control-bg)] px-3 py-2 text-sm text-[var(--oa-ink)] ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--oa-muted)] hover:border-[var(--oa-control-hover-border)] focus-visible:border-[var(--oa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,0,0,0.06)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[var(--oa-paper-soft)] disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
