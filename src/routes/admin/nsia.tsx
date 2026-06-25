import { clientRoleGuard } from "@/lib/auth";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/nsia")({
  beforeLoad: () => { const r = clientRoleGuard(["admin_anzrbo"]); if (r) throw r; },
  component: () => <Outlet />,
});
