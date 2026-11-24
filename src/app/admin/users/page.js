import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { deleteUserAction } from "@/app/admin/actions";

const sortFields = {
  name: "u.full_name",
  username: "u.username",
  role: "u.role",
  division: "d.name",
};

const roleLabels = {
  admin: "Administrator",
  hrd: "HRD",
  division_head: "Kepala divisi",
  employee: "Karyawan",
};

export default async function AdminUsersPage({ searchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const query = String(params?.q ?? "").trim().slice(0, 100);
  const sort = sortFields[params?.sort] ? params.sort : "name";
  const direction = params?.direction === "desc" ? "DESC" : "ASC";
  const result = await db.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.role, u.join_date,
            u.annual_quota, d.name AS division_name,
            EXISTS(SELECT 1 FROM leave_requests lr WHERE lr.user_id=u.id) AS has_requests
     FROM users u
     LEFT JOIN divisions d ON d.id=u.division_id
     WHERE ($1 = '' OR u.full_name ILIKE '%' || $1 || '%'
            OR u.username ILIKE '%' || $1 || '%'
            OR u.email ILIKE '%' || $1 || '%')
     ORDER BY ${sortFields[sort]} ${direction} NULLS LAST, u.id`,
    [query],
  );

  const nextDirection = direction === "ASC" ? "desc" : "asc";
  const queryPart = query ? `&q=${encodeURIComponent(query)}` : "";

  return (
    <AppShell user={admin}>
      <div className="page-heading">
        <div><div className="eyebrow">Admin / CMS</div><h1>Pengguna</h1><p>Kelola akun, peran, dan penempatan divisi.</p></div>
        <Link className="button" href="/admin/users/new">Tambah pengguna</Link>
      </div>
      <AdminNavigation active="/admin/users" />
      {params?.error ? <div className="alert">{params.error === "duplicate" ? "Username atau email sudah digunakan." : "Data pengguna tidak valid atau tidak dapat dihapus."}</div> : null}
      {params?.success ? <div className="alert alert-success">{params.success === "deleted" ? "Pengguna dihapus." : "Perubahan tersimpan."}</div> : null}
      <form className="admin-filter" action="/admin/users">
        <input className="input" type="search" name="q" placeholder="Cari nama, username, atau email" defaultValue={query} />
        <input type="hidden" name="sort" value={sort} />
        <button className="button button-secondary" type="submit">Cari</button>
      </form>
      <section className="panel">
        <DataTable
          columns={[
            { key: "full_name", label: <Link href={`/admin/users?sort=name&direction=${nextDirection}${queryPart}`}>Nama ↕</Link>, render: (row) => <><strong>{row.full_name}</strong><div className="request-meta">{row.email}</div></> },
            { key: "username", label: <Link href={`/admin/users?sort=username&direction=${nextDirection}${queryPart}`}>Username ↕</Link> },
            { key: "role", label: <Link href={`/admin/users?sort=role&direction=${nextDirection}${queryPart}`}>Peran ↕</Link>, render: (row) => roleLabels[row.role] ?? row.role },
            { key: "division_name", label: <Link href={`/admin/users?sort=division&direction=${nextDirection}${queryPart}`}>Divisi ↕</Link>, render: (row) => row.division_name ?? "-" },
            { key: "annual_quota", label: "Kuota", render: (row) => `${row.annual_quota} hari` },
            { key: "actions", label: "", render: (row) => <div className="table-actions"><Link className="text-link" href={`/admin/users/${row.id}`}>Edit</Link><form action={deleteUserAction}><input type="hidden" name="id" value={row.id} /><button className="text-button text-danger" type="submit" disabled={row.id === admin.id || row.role === "admin" || row.has_requests}>Hapus</button></form></div> },
          ]}
          rows={result.rows}
          getRowKey={(row) => row.id}
        />
      </section>
    </AppShell>
  );
}
