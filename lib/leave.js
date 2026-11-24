import { db } from "@/lib/db";

export function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

export function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function countWorkingDays(startValue, endValue, holidays = []) {
  const start = typeof startValue === "string" ? parseDateOnly(startValue) : startValue;
  const end = typeof endValue === "string" ? parseDateOnly(endValue) : endValue;
  if (!start || !end || end < start) return 0;

  const holidaySet = new Set(
    holidays.map((holiday) => {
      if (typeof holiday === "string") return holiday.slice(0, 10);
      if (holiday instanceof Date && !Number.isNaN(holiday.getTime())) {
        return formatDateOnly(holiday);
      }
      if (holiday?.holiday_date) {
        if (typeof holiday.holiday_date === "string") return holiday.holiday_date.slice(0, 10);
        if (holiday.holiday_date instanceof Date && !Number.isNaN(holiday.holiday_date.getTime())) {
          return formatDateOnly(holiday.holiday_date);
        }
      }
      return "";
    }).filter(Boolean),
  );
  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    const key = formatDateOnly(cursor);
    if (day !== 0 && day !== 6 && !holidaySet.has(key)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

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
    requestFilter = user.role === "hrd"
      ? "lr.status = 'approved_by_leader'"
      : "lr.status IN ('pending', 'approved_by_leader')";
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
      : user.role === "division_head"
        ? db.query(
            `SELECT
               COUNT(*) FILTER (WHERE lr.status = 'pending')::int AS pending,
               COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM lr.request_date) = EXTRACT(YEAR FROM CURRENT_DATE))::int AS total
             FROM leave_requests lr
             JOIN users u ON u.id = lr.user_id
             WHERE u.division_id = $1 AND lr.user_id <> $2`,
            [user.division_id, user.id],
          )
        : user.role === "hrd"
          ? db.query(
              `SELECT
                 COUNT(*) FILTER (WHERE status = 'approved_by_leader')::int AS pending,
                 COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM request_date) = EXTRACT(YEAR FROM CURRENT_DATE))::int AS total
               FROM leave_requests`,
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

export async function getLeaveTypes() {
  const result = await db.query(
    `SELECT id, code, name, description, quota_per_year, min_notice_days,
            max_backdate_days, requires_attachment, deducts_annual_quota
     FROM leave_types
     WHERE is_active = TRUE
     ORDER BY id`,
  );
  return result.rows;
}

export async function getHandoverUsers(user) {
  const result = await db.query(
    `SELECT id, full_name
     FROM users
     WHERE division_id = $1 AND id <> $2
     ORDER BY full_name`,
    [user.division_id, user.id],
  );
  return result.rows;
}

export async function getLeaveRequests(user, status = "") {
  let filter = "lr.user_id = $1";
  let values = [user.id];

  if (status) {
    filter += " AND lr.status = $2";
    values.push(status);
  }

  if (user.role === "division_head") {
    if (status) {
      filter = "u.division_id = $1 AND lr.status = $2";
      values = [user.division_id, status];
    } else {
      filter = "(lr.user_id = $1 OR u.division_id = $2)";
      values = [user.id, user.division_id];
    }
  } else if (user.role === "hrd" || user.role === "admin") {
    if (status === "approval_queue") {
      filter = "lr.status = 'approved_by_leader'";
      values = [];
    } else if (status) {
      filter = "lr.status = $1";
      values = [status];
    } else {
      filter = "TRUE";
      values = [];
    }
  }

  const result = await db.query(
    `SELECT lr.id, lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status,
            lr.request_date, lr.created_at, u.full_name, lt.name AS leave_type
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE ${filter}
     ORDER BY lr.created_at DESC`,
    values,
  );
  return result.rows;
}

export async function getLeaveDetail(requestId) {
  const result = await db.query(
    `SELECT lr.*, u.full_name, u.username, u.role, u.division_id,
            lt.name AS leave_type, lt.code AS leave_code,
            handover.full_name AS handover_name,
            d.name AS division_name
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     LEFT JOIN users handover ON handover.id = lr.handover_user_id
     LEFT JOIN divisions d ON d.id = u.division_id
     WHERE lr.id = $1`,
    [requestId],
  );
  if (!result.rows[0]) return null;

  const approvals = await db.query(
    `SELECT la.*, u.full_name AS approver_name
     FROM leave_approvals la
     LEFT JOIN users u ON u.id = la.approver_id
     WHERE la.request_id = $1
     ORDER BY la.decided_at`,
    [requestId],
  );

  return { request: result.rows[0], approvals: approvals.rows };
}
