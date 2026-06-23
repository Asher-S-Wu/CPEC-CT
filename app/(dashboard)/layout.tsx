import type { ReactNode } from "react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ConsoleShell } from "@/components/layout/console-shell";
import { ConsoleLoadingShell } from "@/components/layout/route-loading";
import { requirePageSession } from "@/lib/auth";

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
    <Suspense fallback={<ConsoleLoadingShell variant="dashboard" />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
