import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthLoadingShell } from "@/components/layout/route-loading";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <div className="auth-shell">{children}</div>
    </Suspense>
  );
}
