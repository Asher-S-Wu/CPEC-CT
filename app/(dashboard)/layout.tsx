import type { ReactNode } from "react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ConsoleShell } from "@/components/layout/console-shell";
import { requirePageSession } from "@/lib/auth";

function DashboardLayoutFallback() {
  return (
    <div className="app-shell-bg flex min-h-screen">
      <div className="hidden w-[var(--sidebar-width)] border-r border-[var(--oa-sidebar-border)] bg-[var(--oa-sidebar-bg)] md:block">
        <div className="flex h-[56px] items-center gap-3 border-b border-[var(--oa-sidebar-border)] px-5">
          <div className="h-8 w-8 animate-skeleton-pulse rounded-lg bg-[var(--oa-sidebar-hover-bg)]" />
          <div className="h-4 w-24 animate-skeleton-pulse rounded-md bg-[var(--oa-sidebar-hover-bg)]" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-skeleton-pulse rounded-lg bg-[var(--oa-sidebar-hover-bg)]" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <div className="h-[56px] border-b border-[var(--oa-topbar-border)] bg-[var(--oa-topbar-bg)]" />
        <div className="flex-1 p-8">
          <div className="space-y-4">
            <div className="h-6 w-48 animate-skeleton-pulse rounded-md bg-muted" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-skeleton-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function DashboardLayoutContent({ children }: { children: ReactNode }) {
  await connection();
  const current = await requirePageSession();

  return (
    <ConsoleShell email={current.user.email} role={current.user.role}>
      {children}
    </ConsoleShell>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
