import { forbidden, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { decideLeaveAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { getLeaveRequests } from "@/lib/leave";
import { formatLeaveDate } from "@/lib/date";

export default async function ApprovalsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["division_head", "hrd"].includes(user.role)) forbidden();

  const params = await searchParams;
  const status = user.role === "division_head" ? "pending" : "approval_queue";
  const requests = await getLeaveRequests(user, status);

  const columns = [
    { key: "full_name", label: "Karyawan" },
    { key: "leave_type", label: "Jenis" },
    {
      key: "period",
      label: "Tanggal",
      render: (row) => `${formatLeaveDate(row.start_date)} – ${formatLeaveDate(row.end_date)}`,
    },
    { key: "total_days", label: "Hari", render: (row) => `${row.total_days}` },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Persetujuan</div>
          <h1>Pengajuan menunggu keputusan</h1>
          <p>Tinjau pengajuan sesuai kewenangan peran Anda.</p>
        </div>
      </div>

      {params?.success ? <Alert role="status">Keputusan berhasil disimpan.</Alert> : null}
      {params?.error ? (
        <div style={{ marginBottom: 18 }}>
          <Alert>
            {params.error === "reject_reason"
              ? "Alasan penolakan wajib diisi."
              : "Keputusan tidak dapat diproses."}
          </Alert>
        </div>
      ) : null}

      {requests.length ? (
        <section className="panel">
          <DataTable
            columns={[
              ...columns,
              {
                key: "action",
                label: "Keputusan",
                render: (row) => (
                  <form className="approval-actions" action={decideLeaveAction}>
                    <input type="hidden" name="requestId" value={row.id} />
                    <input type="text" className="input approval-note" name="notes" placeholder="Catatan" />
                    <button className="button button-approve" name="decision" value="approved" type="submit">Setujui</button>
                    <button className="button button-danger" name="decision" value="rejected" type="submit">Tolak</button>
                  </form>
                ),
              },
            ]}
            rows={requests}
            getRowKey={(row) => row.id}
          />
        </section>
      ) : (
        <section className="panel"><div className="empty-state">Tidak ada pengajuan yang perlu diproses.</div></section>
      )}
    </AppShell>
  );
}
