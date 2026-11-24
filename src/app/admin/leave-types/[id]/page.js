import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { LeaveTypeForm } from "@/components/admin/LeaveTypeForm";
import { saveLeaveTypeAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export default async function EditLeaveTypePage({ params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const result = await db.query("SELECT * FROM leave_types WHERE id=$1", [Number(id)]);
  if (!result.rows[0]) notFound();

  return (
    <AppShell user={admin}>
      <div className="page-heading"><div><div className="eyebrow">Admin / Jenis cuti</div><h1>Edit jenis cuti</h1></div></div>
      <AdminNavigation active="/admin/leave-types" />
      <LeaveTypeForm action={saveLeaveTypeAction} leaveType={result.rows[0]} />
    </AppShell>
  );
}
