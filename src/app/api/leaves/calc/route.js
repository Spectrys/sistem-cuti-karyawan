import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countWorkingDays, parseDateOnly } from "@/lib/leave";
import { getCurrentUser } from "@/lib/session";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const leaveTypeId = Number(body.leaveTypeId);
  const start = parseDateOnly(body.startDate);
  const end = parseDateOnly(body.endDate);
  if (!leaveTypeId || !start || !end || end < start) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [typeResult, holidayResult] = await Promise.all([
    db.query(
      "SELECT * FROM leave_types WHERE id = $1 AND is_active = TRUE",
      [leaveTypeId],
    ),
    db.query(
      "SELECT to_char(holiday_date, 'YYYY-MM-DD') AS holiday_date FROM holidays WHERE holiday_date BETWEEN $1 AND $2",
      [body.startDate, body.endDate],
    ),
  ]);
  if (!typeResult.rows[0]) {
    return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
  }

  const totalDays =
    body.isHalfDay === true
      ? body.startDate === body.endDate ? 0.5 : 0
      : countWorkingDays(start, end, holidayResult.rows.map((row) => row.holiday_date));

  if (totalDays <= 0) {
    return NextResponse.json({ error: "Tidak ada hari kerja pada periode ini" }, { status: 400 });
  }

  return NextResponse.json({
    totalDays,
    workingDayCalculation: "Sabtu, Minggu, dan hari libur tidak dihitung",
  });
}
