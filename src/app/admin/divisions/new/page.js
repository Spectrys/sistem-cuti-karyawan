import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { DivisionForm } from "@/components/admin/DivisionForm";
import { saveDivisionAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export default async function NewDivisionPage() {
  const admin = await requireAdmin();
  const leaders = await db.query(
    "SELECT id,full_name FROM users WHERE role='division_head' ORDER BY full_name",
  );
  return (
    <AppShell user={admin}>
      <div className="page-heading"><div><div className="eyebrow">Admin / Divisi</div><h1>Tambah divisi</h1></div></div>
      <AdminNavigation active="/admin/divisions" />
      <DivisionForm action={saveDivisionAction} leaders={leaders.rows} />
    </AppShell>
  );
}
