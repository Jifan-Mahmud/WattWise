import React, { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { WattWiseMark } from "@/components/ui/MotionPrimitives";

function WorkspaceLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ww-bg text-ww-fg-secondary">
      <div className="flex items-center gap-3 text-[14px]">
        <WattWiseMark size={20} />
        <span>Loading telemetry workspace…</span>
      </div>
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<WorkspaceLoadingFallback />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
