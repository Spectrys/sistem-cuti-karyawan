import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { DataTable } from "@/components/ui/DataTable";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { deleteDivisionAction } from "@/app/admin/actions";

export default async function AdminDivisionsPage({ searchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const result = await db.query(
    `SELECT d.id,d.name,d.description,u.full_name AS leader_name,
            COUNT(m.id)::int AS member_count
     FROM divisions d
     LEFT JOIN users u ON u.id=d.leader_id
     LEFT JOIN users m ON m.division_id=d.id
     GROUP BY d.id,u.full_name
     ORDER BY d.name`,
  );

  return (
    <AppShell user={admin}>
      <div className="page-heading">
        <div><div className="eyebrow">Admin / CMS</div><h1>Divisi</h1><p>Kelola divisi, kepala, dan anggota.</p></div>
        <Link className="button" href="/admin/divisions/new">Tambah divisi</Link>
      </div>
      <AdminNavigation active="/admin/divisions" />
      {params?.error ? <div className="alert">{params.error === "duplicate" ? "Nama divisi sudah digunakan." : "Divisi masih memiliki anggota atau data tidak valid."}</div> : null}
      {params?.success ? <div className="alert alert-success">Perubahan divisi tersimpan.</div> : null}
      <section className="panel">
        <DataTable
          columns={[
            { key: "name", label: "Divisi", render: (row) => <><strong>{row.name}</strong><div className="request-meta">{row.description ?? ""}</div></> },
            { key: "leader_name", label: "Kepala divisi", render: (row) => row.leader_name ?? "Belum ditentukan" },
            { key: "member_count", label: "Anggota", render: (row) => `${row.member_count} orang` },
            { key: "actions", label: "", render: (row) => <div className="table-actions"><Link className="text-link" href={`/admin/divisions/${row.id}`}>Detail / edit</Link><form action={deleteDivisionAction}><input type="hidden" name="id" value={row.id} /><button className="text-button text-danger" type="submit" disabled={row.member_count > 0}>Hapus</button></form></div> },
          ]}
          rows={result.rows}
          getRowKey={(row) => row.id}
        />
      </section>
    </AppShell>
  );
}
