import type { ReactNode } from "react";
import { Suspense } from "react";
import { ConsoleShell } from "@/components/layout/console-shell";
import { ConsoleLoadingShell } from "@/components/layout/route-loading";
import { requirePageSession } from "@/lib/auth";
import "./ai.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

async function AiLayoutContent({ children }: { children: ReactNode }) {
  const current = await requirePageSession();

  return (
    <ConsoleShell email={current.user.email} role={current.user.role}>
      <div className="ai-shell w-full">{children}</div>
    </ConsoleShell>
  );
}

export default function AiLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ConsoleLoadingShell variant="ai" />}>
      <AiLayoutContent>{children}</AiLayoutContent>
    </Suspense>
  );
}
