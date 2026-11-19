import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireAuthenticatedUser } from "@/lib/require-authenticated-user";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedUser();

  return <DashboardShell>{children}</DashboardShell>;
}
