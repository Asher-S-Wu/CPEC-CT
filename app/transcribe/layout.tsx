import type { ReactNode } from "react";
import { Suspense } from "react";
import { ConsoleShell } from "@/components/layout/console-shell";
import { ConsoleLoadingShell } from "@/components/layout/route-loading";
import { Sidebar } from "@/components/transcribe/layout/transcribe-sidebar";
import { requirePageSession } from "@/lib/auth";

async function TranscribeLayoutContent({ children }: { children: ReactNode }) {
  const current = await requirePageSession();

  return (
    <ConsoleShell email={current.user.email} role={current.user.role}>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <Sidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </ConsoleShell>
  );
}

export default function TranscribeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ConsoleLoadingShell variant="section" sectionItems={2} />}>
      <TranscribeLayoutContent>{children}</TranscribeLayoutContent>
    </Suspense>
  );
}
