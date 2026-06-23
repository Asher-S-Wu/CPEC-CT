import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-logo";

type ContentVariant = "dashboard" | "section" | "ai";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-skeleton-pulse rounded-md bg-[var(--oa-paper-soft)] ${className}`}
    />
  );
}

function AppSidebarLoading() {
  return (
    <aside className="app-sidebar hidden md:flex md:min-h-[100dvh] md:flex-col">
      <div className="app-sidebar-surface">
        <div className="app-sidebar-brand">
          <BrandMark className="app-sidebar-mark" />
          <SkeletonBlock className="h-4 w-20 bg-[var(--oa-sidebar-hover-bg)]" />
        </div>
        <div className="flex-1 px-3 py-6">
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, sectionIndex) => (
              <div key={sectionIndex} className="space-y-2">
                <div className="px-5">
                  <SkeletonBlock className="h-3 w-20 bg-[var(--oa-sidebar-hover-bg)]" />
                </div>
                {Array.from({ length: sectionIndex === 0 ? 4 : 2 }).map((__, itemIndex) => (
                  <SkeletonBlock
                    key={itemIndex}
                    className="mx-3 h-9 rounded-lg bg-[var(--oa-sidebar-hover-bg)]"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="app-sidebar-theme-panel">
          <SkeletonBlock className="h-8 rounded-lg bg-[var(--oa-sidebar-hover-bg)]" />
        </div>
      </div>
    </aside>
  );
}

function TopbarLoading() {
  return (
    <header className="app-topbar md:min-h-[56px] md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SkeletonBlock className="h-5 w-28" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBlock className="hidden h-9 w-44 rounded-lg md:block" />
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>
    </header>
  );
}

function SectionSidebarLoading({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <>
      <div className="-mx-1 flex gap-1.5 overflow-hidden px-1 pb-1 lg:hidden">
        {Array.from({ length: Math.min(itemCount, 3) }).map((_, index) => (
          <SkeletonBlock key={index} className="h-9 w-24 shrink-0 rounded-lg" />
        ))}
      </div>

      <div className="section-sidebar-panel sticky top-20 hidden w-full flex-col overflow-hidden lg:flex">
        <div className="space-y-2 border-b border-[var(--oa-card-head-border)] px-5 py-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
        <div className="space-y-2 px-2.5 py-3">
          {Array.from({ length: itemCount }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </>
  );
}

function LoadingCard({
  children,
  header = true,
}: {
  children: ReactNode;
  header?: boolean;
}) {
  return (
    <section className="rounded-xl border border-[var(--oa-card-border)] bg-[var(--oa-card-bg)]">
      {header ? (
        <div className="space-y-2 border-b border-[var(--oa-card-head-border)] p-5 md:p-6">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-4 w-full max-w-md" />
        </div>
      ) : null}
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

export function SectionContentLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <LoadingCard>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-[var(--oa-card-border)] p-4"
            >
              <SkeletonBlock className="mx-auto h-8 w-8 rounded-lg" />
              <SkeletonBlock className="mx-auto h-4 w-24" />
              <SkeletonBlock className="mx-auto h-3 w-44 max-w-full" />
            </div>
          ))}
        </div>
      </LoadingCard>

      <LoadingCard>
        <div className="space-y-4">
          <SkeletonBlock className="h-32 w-full rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonBlock className="h-11 rounded-lg" />
            <SkeletonBlock className="h-11 rounded-lg" />
          </div>
        </div>
      </LoadingCard>

      <LoadingCard>
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </LoadingCard>

      <SkeletonBlock className="h-11 w-full rounded-lg" />
    </div>
  );
}

export function DashboardContentLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingCard key={index} header={false}>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-8 w-20" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          </LoadingCard>
        ))}
      </div>
      <LoadingCard>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </LoadingCard>
    </div>
  );
}

export function ListCardsLoading({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: itemCount }).map((_, index) => (
        <LoadingCard key={index}>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="h-4 w-44" />
              </div>
              <div className="flex gap-2">
                <SkeletonBlock className="h-9 w-9 rounded-lg" />
                <SkeletonBlock className="h-9 w-9 rounded-lg" />
                <SkeletonBlock className="h-9 w-9 rounded-lg" />
              </div>
            </div>
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
            <div className="grid gap-3 sm:grid-cols-3">
              <SkeletonBlock className="h-16 rounded-lg" />
              <SkeletonBlock className="h-16 rounded-lg" />
              <SkeletonBlock className="h-16 rounded-lg" />
            </div>
          </div>
        </LoadingCard>
      ))}
    </div>
  );
}

export function GridCardsLoading({ itemCount = 6 }: { itemCount?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: itemCount }).map((_, index) => (
        <LoadingCard key={index}>
          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-4 w-full" />
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
            <SkeletonBlock className="h-10 rounded-lg" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-10 flex-1 rounded-lg" />
              <SkeletonBlock className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        </LoadingCard>
      ))}
    </div>
  );
}

export function AiContentLoading() {
  return (
    <div className="ai-shell w-full">
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden xl:block">
          <div className="sticky top-20 h-[calc(100dvh-8.5rem)] min-h-[32rem] rounded-xl border border-[var(--ai-panel-border)] bg-[var(--ai-shell-surface)] p-3">
            <SkeletonBlock className="mb-4 h-11 rounded-lg" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-14 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-[70dvh] rounded-xl border border-[var(--ai-panel-border)] bg-[var(--ai-shell-surface)]">
          <div className="flex h-14 items-center justify-between border-b border-[var(--ai-panel-border)] px-4">
            <SkeletonBlock className="h-8 w-36 rounded-lg" />
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
          <div className="space-y-5 p-5">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-8 w-8 rounded-full" />
              <SkeletonBlock className="h-24 w-full max-w-2xl rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <SkeletonBlock className="h-20 w-full max-w-xl rounded-2xl" />
            </div>
          </div>
          <div className="mt-auto border-t border-[var(--ai-panel-border)] p-4">
            <SkeletonBlock className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingContent({
  variant,
}: {
  variant: ContentVariant;
}) {
  if (variant === "ai") return <AiContentLoading />;
  if (variant === "dashboard") return <DashboardContentLoading />;
  return <SectionContentLoading />;
}

export function ConsoleLoadingShell({
  variant = "dashboard",
  sectionItems,
}: {
  variant?: ContentVariant;
  sectionItems?: number;
}) {
  return (
    <div className="app-shell app-shell-bg">
      <AppSidebarLoading />
      <main className="app-main flex flex-col">
        <TopbarLoading />
        <div className="app-content">
          <div className="site-layout-content">
            {typeof sectionItems === "number" ? (
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
                <SectionSidebarLoading itemCount={sectionItems} />
                <div className="min-w-0">
                  <LoadingContent variant={variant} />
                </div>
              </div>
            ) : (
              <LoadingContent variant={variant} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthLoadingShell() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="mb-8 flex flex-col items-center">
          <BrandMark className="mb-3 h-12 w-12 rounded-xl" />
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="mt-3 h-4 w-44" />
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-10 w-full rounded-lg" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
          <SkeletonBlock className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
