import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { deleteLeaveTypeAction } from "@/app/admin/actions";

export default async function AdminLeaveTypesPage({ searchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const result = await db.query(
    `SELECT lt.*, COUNT(lr.id)::int AS request_count
     FROM leave_types lt
     LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
     GROUP BY lt.id
     ORDER BY lt.id`,
  );

  return (
    <AppShell user={admin}>
      <div className="page-heading">
        <div><div className="eyebrow">Admin / CMS</div><h1>Jenis cuti</h1><p>Atur kuota dan aturan pengajuan cuti.</p></div>
        <Link className="button" href="/admin/leave-types/new">Tambah jenis cuti</Link>
      </div>
      <AdminNavigation active="/admin/leave-types" />
      {params?.error ? <div className="alert">{params.error === "duplicate" ? "Kode atau nama sudah digunakan." : "Data tidak valid atau jenis cuti tidak dapat dihapus."}</div> : null}
      {params?.success ? <div className="alert alert-success">{params.success === "deleted" ? "Jenis cuti dihapus." : "Perubahan tersimpan."}</div> : null}
      <section className="panel">
        <DataTable
          columns={[
            { key: "name", label: "Nama", render: (row) => <><strong>{row.name}</strong><div className="request-meta">{row.code}</div></> },
            { key: "quota_per_year", label: "Kuota", render: (row) => row.quota_per_year === null ? "Tanpa batas" : `${row.quota_per_year} hari` },
            { key: "rules", label: "Aturan", render: (row) => <>{row.min_notice_days} hari pemberitahuan{row.requires_attachment ? " · wajib lampiran" : ""}</> },
            { key: "is_active", label: "Status", render: (row) => <StatusBadge status={row.is_active ? "approved" : "cancelled"} /> },
            { key: "actions", label: "", render: (row) => <div className="table-actions"><Link className="text-link" href={`/admin/leave-types/${row.id}`}>Edit</Link><form action={deleteLeaveTypeAction}><input type="hidden" name="id" value={row.id} /><button className="text-button text-danger" type="submit" disabled={row.is_system || Number(row.request_count) > 0}>Hapus</button></form></div> },
          ]}
          rows={result.rows}
          getRowKey={(row) => row.id}
        />
      </section>
    </AppShell>
  );
}
