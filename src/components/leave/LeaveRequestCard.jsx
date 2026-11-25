import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatLeaveDate } from "@/lib/date";

export function LeaveRequestCard({ request }) {
  const start = formatLeaveDate(request.start_date);
  const end = formatLeaveDate(request.end_date);

  return (
    <Link className="request-row" href={`/leaves/${request.id}`}>
      <div>
        <div className="request-title">{request.leave_type}</div>
        <div className="request-meta">
          {request.full_name ? `${request.full_name} · ` : ""}
          {start} – {end} · {request.total_days} hari
        </div>
        {request.reason ? <div className="request-reason">{request.reason}</div> : null}
      </div>
      <StatusBadge status={request.status} />
    </Link>
  );
}
