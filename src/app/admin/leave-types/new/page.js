import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { LeaveTypeForm } from "@/components/admin/LeaveTypeForm";
import { saveLeaveTypeAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";

export default async function NewLeaveTypePage() {
  const admin = await requireAdmin();
  return (
    <AppShell user={admin}>
      <div className="page-heading"><div><div className="eyebrow">Admin / Jenis cuti</div><h1>Tambah jenis cuti</h1></div></div>
      <AdminNavigation active="/admin/leave-types" />
      <LeaveTypeForm action={saveLeaveTypeAction} />
    </AppShell>
  );
}
