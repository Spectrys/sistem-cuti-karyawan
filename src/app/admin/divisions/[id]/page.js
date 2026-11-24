import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { DivisionForm } from "@/components/admin/DivisionForm";
import { DataTable } from "@/components/ui/DataTable";
import { saveDivisionAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

const roleLabels = {
  admin: "Administrator",
  hrd: "HRD",
  division_head: "Kepala divisi",
  employee: "Karyawan",
};

export default async function DivisionDetailPage({ params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [division, leaders, members] = await Promise.all([
    db.query(
      `SELECT d.*,u.full_name AS leader_name
       FROM divisions d LEFT JOIN users u ON u.id=d.leader_id WHERE d.id=$1`,
      [Number(id)],
    ),
    db.query("SELECT id,full_name FROM users WHERE role='division_head' ORDER BY full_name"),
    db.query(
      `SELECT id,full_name,username,email,role
       FROM users WHERE division_id=$1 ORDER BY full_name`,
      [Number(id)],
    ),
  ]);
  if (!division.rows[0]) notFound();

  return (
    <AppShell user={admin}>
      <div className="page-heading"><div><div className="eyebrow">Admin / Divisi</div><h1>{division.rows[0].name}</h1><p>{members.rows.length} anggota</p></div></div>
      <AdminNavigation active="/admin/divisions" />
      <DivisionForm action={saveDivisionAction} division={division.rows[0]} leaders={leaders.rows} />
      <section className="panel admin-members">
        <div className="panel-heading"><h2>Anggota divisi</h2></div>
        <DataTable
          columns={[
            { key: "full_name", label: "Nama" },
            { key: "username", label: "Username" },
            { key: "email", label: "Email" },
            { key: "role", label: "Peran", render: (row) => roleLabels[row.role] ?? row.role },
          ]}
          rows={members.rows}
          getRowKey={(row) => row.id}
        />
      </section>
    </AppShell>
  );
}
