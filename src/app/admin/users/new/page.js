import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { UserForm } from "@/components/admin/UserForm";
import { saveUserAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export default async function NewUserPage() {
  const admin = await requireAdmin();
  const divisions = await db.query("SELECT id,name FROM divisions ORDER BY name");
  return (
    <AppShell user={admin}>
      <div className="page-heading"><div><div className="eyebrow">Admin / Pengguna</div><h1>Tambah pengguna</h1></div></div>
      <AdminNavigation active="/admin/users" />
      <UserForm action={saveUserAction} divisions={divisions.rows} />
    </AppShell>
  );
}
