import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cancelLeaveAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { getLeaveDetail } from "@/lib/leave";
import { formatLeaveDate } from "@/lib/date";

export default async function LeaveDetailPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const routeParams = await params;
  const requestId = Number(routeParams.id);
  if (!Number.isInteger(requestId) || requestId < 1) notFound();
  const data = await getLeaveDetail(requestId);
  if (!data) notFound();

  const { request, approvals } = data;
  const canView =
    user.role === "admin" ||
    user.role === "hrd" ||
    request.user_id === user.id ||
    (user.role === "division_head" && request.division_id === user.division_id);
  if (!canView) forbidden();

  const canCancel =
    request.user_id === user.id &&
    ["pending", "approved_by_leader"].includes(request.status);

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Pengajuan #{request.id}</div>
          <h1>{request.leave_type}</h1>
          <p>{request.full_name} · {request.division_name ?? "Tanpa divisi"}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="detail-grid">
        <section className="panel detail-panel">
          <div className="panel-heading"><h2>Informasi cuti</h2></div>
          <dl className="detail-list">
            <div><dt>Tanggal</dt><dd>{formatLeaveDate(request.start_date, "long")} – {formatLeaveDate(request.end_date, "long")}</dd></div>
            <div><dt>Durasi</dt><dd>{request.total_days} hari</dd></div>
            <div><dt>Alasan</dt><dd>{request.reason}</dd></div>
            <div><dt>Rekan pengganti</dt><dd>{request.handover_name ?? "Tidak ada"}</dd></div>
            <div><dt>Alamat</dt><dd>{request.leave_address ?? "-"}</dd></div>
            <div><dt>Telepon darurat</dt><dd>{request.emergency_phone ?? "-"}</dd></div>
          </dl>
        </section>

        <section className="panel detail-panel">
          <div className="panel-heading"><h2>Riwayat keputusan</h2></div>
          {approvals.length ? (
            <div className="timeline">
              {approvals.map((approval) => (
                <article className="timeline-item" key={approval.id}>
                  <strong>{approval.level === "leader" ? "Kepala divisi" : "HRD"}</strong>
                  <StatusBadge status={approval.decision} />
                  {approval.notes ? <p>{approval.notes}</p> : null}
                  <small>{approval.approver_name ?? "Sistem"}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Belum ada keputusan.</div>
          )}
        </section>
      </div>

      {canCancel ? (
        <form className="cancel-panel panel" action={cancelLeaveAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <label className="field" htmlFor="cancelReason">
            Alasan pembatalan
            <textarea className="textarea" id="cancelReason" name="reason" rows="3" required />
          </label>
          <button className="button button-danger" type="submit">Batalkan pengajuan</button>
        </form>
      ) : null}

      <p style={{ marginTop: 18 }}>
        <Link className="text-link" href="/leaves">← Kembali ke daftar</Link>
      </p>
    </AppShell>
  );
}
