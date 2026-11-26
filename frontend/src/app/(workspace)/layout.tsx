import React, { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingPanel } from "@/components/ui/DataState";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <Suspense fallback={<LoadingPanel rows={8} />}>{children}</Suspense>
    </DashboardShell>
  );
}
