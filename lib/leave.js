import { db } from "@/lib/db";

export async function getDashboardData(user) {
  let requestFilter;
  let filterValues;
  let employeeFilter;
  let employeeValues;

  if (user.role === "employee") {
    requestFilter = "lr.user_id = $1";
    filterValues = [user.id];
    employeeFilter = "role = 'employee'";
    employeeValues = [];
  } else if (user.role === "division_head") {
    requestFilter = "u.division_id = $1 AND lr.status = 'pending' AND lr.user_id <> $2";
    filterValues = [user.division_id, user.id];
    employeeFilter = "role = 'employee' AND division_id = $1";
    employeeValues = [user.division_id];
  } else {
    requestFilter = "lr.status IN ('pending', 'approved_by_leader')";
    filterValues = [];
    employeeFilter = "role = 'employee'";
    employeeValues = [];
  }

  const [requestsResult, totalsResult, employeeResult] = await Promise.all([
    db.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status,
              u.full_name, lt.name AS leave_type
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE ${requestFilter}
       ORDER BY lr.created_at DESC
       LIMIT 6`,
      filterValues,
    ),
    user.role === "employee"
      ? db.query(
          `SELECT
             COUNT(*) FILTER (WHERE status IN ('pending', 'approved_by_leader'))::int AS pending,
             COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM request_date) = EXTRACT(YEAR FROM CURRENT_DATE))::int AS total,
             COALESCE(SUM(total_days) FILTER (
               WHERE status = 'approved'
                 AND deducts_quota = TRUE
                 AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
             ), 0)::numeric AS used
           FROM leave_requests
           WHERE user_id = $1`,
          [user.id],
        )
      : db.query(
          `SELECT
             COUNT(*) FILTER (WHERE status IN ('pending', 'approved_by_leader'))::int AS pending,
             COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM request_date) = EXTRACT(YEAR FROM CURRENT_DATE))::int AS total
           FROM leave_requests`,
        ),
    db.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE ${employeeFilter}`,
      employeeValues,
    ),
  ]);

  const totals = totalsResult.rows[0];
  const quota = Number(user.annual_quota ?? 0);

  return {
    requests: requestsResult.rows,
    pending: Number(totals.pending ?? 0),
    total: Number(totals.total ?? 0),
    employees: Number(employeeResult.rows[0].count ?? 0),
    remaining:
      user.role === "employee"
        ? Math.max(0, quota - Number(totals.used ?? 0))
        : 0,
  };
}