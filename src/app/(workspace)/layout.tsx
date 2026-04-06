import { AppShell } from "@/components/app-shell";
import { WorkspaceGate } from "@/components/workspace-gate";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceGate>
      <AppShell>{children}</AppShell>
    </WorkspaceGate>
  );
}
