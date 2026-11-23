import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentUser } from "@/lib/session";
import { getLeaveRequests } from "@/lib/leave";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export default async function LeavesPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const requests = await getLeaveRequests(user, params?.status ?? "");

  const columns = [
    { key: "leave_type", label: "Jenis" },
    {
      key: "period",
      label: "Tanggal",
      render: (row) =>
        `${dateFormatter.format(new Date(row.start_date))} – ${dateFormatter.format(new Date(row.end_date))}`,
    },
    { key: "total_days", label: "Durasi", render: (row) => `${row.total_days} hari` },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Cuti</div>
          <h1>Daftar pengajuan</h1>
          <p>Filter dan lihat semua pengajuan cuti Anda.</p>
        </div>
        <Link className="button" href="/leaves/new">Ajukan cuti</Link>
      </div>

      {params?.success ? (
        <div className="alert alert-success" role="status">
          {params.success === "submitted" ? "Pengajuan cuti berhasil dikirim." : "Pengajuan cuti dibatalkan."}
        </div>
      ) : null}

      <div className="filter-row" aria-label="Filter status">
        {["", "pending", "approved_by_leader", "approved", "rejected", "cancelled"].map((status) => (
          <Link
            className={`filter-chip ${params?.status === status || (!params?.status && status === "") ? "filter-active" : ""}`}
            href={status ? `/leaves?status=${status}` : "/leaves"}
            key={status || "all"}
          >
            {status ? status.replaceAll("_", " ") : "Semua"}
          </Link>
        ))}
      </div>

      <section className="panel">
        <DataTable
          columns={[
            ...columns,
            {
              key: "detail",
              label: "",
              render: (row) => <Link className="text-link" href={`/leaves/${row.id}`}>Lihat detail</Link>,
            },
          ]}
          rows={requests}
          getRowKey={(row) => row.id}
        />
      </section>
    </AppShell>
  );
}
