const statusLabels = {
  pending: "Menunggu",
  approved_by_leader: "Menunggu HRD",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export function StatusBadge({ status }) {
  const tone =
    status === "approved" || status === "approved_by_leader"
      ? "status-approved"
      : status === "rejected" || status === "cancelled"
        ? "status-rejected"
        : "status-pending";

  return (
    <span className={`status-badge ${tone}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}
