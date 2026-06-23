import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "cyan" | "green" | "gold" | "plum" | "red";

const toneClass: Record<Tone, string> = {
  blue: "!border-[var(--oa-control-hover-border)] !bg-[var(--primary-light)] !text-[var(--oa-ink)]",
  cyan: "!border-[var(--oa-control-hover-border)] !bg-[var(--primary-light)] !text-[var(--oa-ink)]",
  green: "!border-[rgba(22,163,74,0.2)] !bg-[rgba(22,163,74,0.08)] !text-[var(--oa-green)]",
  gold: "!border-[rgba(202,138,4,0.2)] !bg-[rgba(202,138,4,0.08)] !text-[var(--oa-gold)]",
  plum: "!border-[var(--oa-control-hover-border)] !bg-[var(--primary-light)] !text-[var(--oa-ink)]",
  red: "!border-[rgba(220,38,38,0.2)] !bg-[rgba(220,38,38,0.08)] !text-[var(--oa-red)]"
};

interface MetricCardProps {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}

export function MetricCard({ label, value, description, icon, tone = "blue", className }: MetricCardProps) {
  return (
    <div className={cn("group rounded-xl border border-[var(--oa-card-border)] bg-[var(--oa-card-bg)] p-4 transition-colors hover:border-[var(--oa-ink)]", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", toneClass[tone])}>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--oa-muted)]">{label}</p>
          <div className="mt-1 font-heading text-2xl font-semibold leading-none text-[var(--oa-ink)] tracking-tight">{value}</div>
          {description ? <div className="mt-2 text-xs leading-5 text-[var(--oa-muted)]">{description}</div> : null}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("empty-state", className)}>
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)] text-[var(--oa-muted)]">{icon}</div> : null}
      <h3 className="font-heading text-lg font-semibold text-[var(--oa-ink)] tracking-tight">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-[var(--oa-muted)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
