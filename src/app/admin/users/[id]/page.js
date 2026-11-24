import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { UserForm } from "@/components/admin/UserForm";
import { saveUserAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export default async function EditUserPage({ params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [user, divisions] = await Promise.all([
    db.query("SELECT * FROM users WHERE id=$1", [Number(id)]),
    db.query("SELECT id,name FROM divisions ORDER BY name"),
  ]);
  if (!user.rows[0]) notFound();

  return (
    <AppShell user={admin}>
      <div className="page-heading"><div><div className="eyebrow">Admin / Pengguna</div><h1>Edit pengguna</h1></div></div>
      <AdminNavigation active="/admin/users" />
      <UserForm action={saveUserAction} user={user.rows[0]} divisions={divisions.rows} />
    </AppShell>
  );
}
