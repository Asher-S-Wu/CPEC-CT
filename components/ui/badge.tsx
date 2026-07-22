import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)] text-[var(--oa-ink)]",
        secondary:
          "border-[var(--oa-card-border)] bg-[var(--oa-card-bg)] text-[var(--oa-ink-2)]",
        destructive:
          "border-transparent bg-[var(--oa-danger)] text-destructive-foreground",
        outline: "border-[var(--oa-card-border)] bg-[var(--oa-card-bg)] text-[var(--oa-muted)]",
        success:
          "border-[hsl(var(--success-border))] bg-[hsl(var(--success-light))] text-[var(--oa-green)]",
        warning:
          "border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-light))] text-[var(--oa-gold)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
