"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import { authenticate, createSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  countWorkingDays,
  formatDateOnly,
  parseDateOnly,
} from "@/lib/leave";

const SESSION_COOKIE = "leave_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

export async function loginAction(formData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) redirect("/login?error=invalid");

  const user = await authenticate(username, password);
  if (!user) redirect("/login?error=invalid");

  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

function cleanText(value, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function updateProfileAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const fullName = cleanText(formData.get("fullName"), 150);
  const email = cleanText(formData.get("email"), 150).toLowerCase();
  const phone = cleanText(formData.get("phone"), 30) || null;
  const address = cleanText(formData.get("address"), 500) || null;
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/profile?error=invalid");
  }

  try {
    await db.query(
      `UPDATE users SET full_name=$2, email=$3, phone=$4, address=$5 WHERE id=$1`,
      [user.id, fullName, email, phone, address],
    );
  } catch (error) {
    if (error.code === "23505") redirect("/profile?error=duplicate");
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/profile?success=saved");
}

export async function submitLeaveAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const leaveTypeId = Number(formData.get("leaveTypeId"));
  const startValue = cleanText(formData.get("startDate"), 10);
  const endValue = cleanText(formData.get("endDate"), 10);
  const isHalfDay = formData.get("isHalfDay") === "true";
  const reason = cleanText(formData.get("reason"), 2000);
  const handoverUserId = Number(formData.get("handoverUserId")) || null;
  const handoverNotes = cleanText(formData.get("handoverNotes"), 2000);
  const leaveAddress = cleanText(formData.get("leaveAddress"), 255);
  const emergencyPhone = cleanText(formData.get("emergencyPhone"), 30);

  const start = parseDateOnly(startValue);
  const end = parseDateOnly(endValue);
  if (!leaveTypeId || !start || !end || end < start || !reason) {
    redirect("/leaves/new?error=invalid");
  }
  if (isHalfDay && startValue !== endValue) {
    redirect("/leaves/new?error=invalid");
  }

  try {
    await db.transaction(async (client) => {
      const typeResult = await client.query(
        `SELECT * FROM leave_types WHERE id = $1 AND is_active = TRUE`,
        [leaveTypeId],
      );
      const leaveType = typeResult.rows[0];
      if (!leaveType) throw new Error("invalid");

      const holidayResult = await client.query(
        "SELECT to_char(holiday_date, 'YYYY-MM-DD') AS holiday_date FROM holidays WHERE holiday_date BETWEEN $1 AND $2",
        [startValue, endValue],
      );
      const totalDays = isHalfDay
        ? 0.5
        : countWorkingDays(start, end, holidayResult.rows.map((row) => row.holiday_date));

      if (totalDays <= 0) throw new Error("invalid");

      const today = new Date();
      const todayValue = formatDateOnly(new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      )));
      const todayDate = parseDateOnly(todayValue);
      const calendarNotice = Math.round((start - todayDate) / 86400000);
      const backdate = Math.round((todayDate - start) / 86400000);

      if (backdate <= 0 && calendarNotice < Number(leaveType.min_notice_days)) {
        throw new Error("notice");
      }
      if (backdate > Number(leaveType.max_backdate_days)) {
        throw new Error("backdate");
      }
      if (
        leaveType.requires_attachment &&
        !String(formData.get("attachmentPath") ?? "").trim()
      ) {
        throw new Error("attachment");
      }
      if (handoverUserId === user.id) throw new Error("invalid");

      const overlap = await client.query(
        `SELECT id FROM leave_requests
         WHERE user_id = $1
           AND status NOT IN ('rejected', 'cancelled')
           AND start_date <= $3
           AND end_date >= $2
         LIMIT 1`,
        [user.id, startValue, endValue],
      );
      if (overlap.rows[0]) throw new Error("overlap");

      if (leaveType.code === "ANNUAL") {
        const userResult = await client.query(
          `SELECT join_date, annual_quota FROM users WHERE id = $1`,
          [user.id],
        );
        const employee = userResult.rows[0];
        const joinDate = parseDateOnly(formatDateOnly(new Date(employee.join_date)));
        const eligibleDate = new Date(joinDate);
        eligibleDate.setUTCFullYear(eligibleDate.getUTCFullYear() + 1);
        if (start < eligibleDate) throw new Error("tenure");

        const usedResult = await client.query(
          `SELECT COALESCE(SUM(total_days), 0)::numeric AS used
           FROM leave_requests
           WHERE user_id = $1
             AND deducts_quota = TRUE
             AND status = 'approved'
             AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
          [user.id],
        );
        const used = Number(usedResult.rows[0].used);
        if (used + totalDays > Number(employee.annual_quota)) throw new Error("quota");
      }

      const status =
        user.role === "division_head" ? "approved_by_leader" : "pending";

      const inserted = await client.query(
        `INSERT INTO leave_requests
           (user_id, leave_type_id, request_date, start_date, end_date, is_half_day,
            total_days, reason, handover_user_id, handover_notes, attachment_path,
            leave_address, emergency_phone, status, deducts_quota)
         VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          user.id,
          leaveTypeId,
          startValue,
          endValue,
          isHalfDay,
          totalDays,
          reason,
          handoverUserId,
          handoverNotes || null,
          cleanText(formData.get("attachmentPath"), 255) || null,
          leaveAddress || null,
          emergencyPhone || null,
          status,
          leaveType.deducts_annual_quota,
        ],
      );

      if (handoverUserId) {
        await client.query(
          `INSERT INTO notifications
             (user_id, message, related_request_id)
           VALUES ($1,$2,$3)`,
          [
            handoverUserId,
            `${user.full_name} menunjuk Anda sebagai rekan pengganti pada pengajuan cuti ${startValue} sampai ${endValue}.`,
            inserted.rows[0].id,
          ],
        );
      }
    });
  } catch (error) {
    const code = ["invalid", "notice", "backdate", "attachment", "overlap", "tenure", "quota"].includes(error.message)
      ? error.message
      : "invalid";
    redirect(`/leaves/new?error=${code}`);
  }

  redirect("/leaves?success=submitted");
}

export async function cancelLeaveAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const requestId = Number(formData.get("requestId"));
  const reason = cleanText(formData.get("reason"), 500);
  if (!requestId || !reason) redirect("/leaves?error=invalid");

  const result = await db.query(
    `UPDATE leave_requests
     SET status = 'cancelled', cancel_reason = $3
     WHERE id = $1 AND user_id = $2
       AND status IN ('pending', 'approved_by_leader')
     RETURNING id`,
    [requestId, user.id, reason],
  );
  if (!result.rows[0]) redirect("/leaves?error=invalid");
  redirect("/leaves?success=cancelled");
}

export async function decideLeaveAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["division_head", "hrd"].includes(user.role)) forbidden();

  const requestId = Number(formData.get("requestId"));
  const decision = formData.get("decision");
  const notes = cleanText(formData.get("notes"), 1000);
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    redirect("/approvals?error=invalid");
  }
  if (decision === "rejected" && !notes) {
    redirect("/approvals?error=reject_reason");
  }

  await db.transaction(async (client) => {
    const requestResult = await client.query(
      `SELECT lr.*, u.division_id
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.id = $1
       FOR UPDATE`,
      [requestId],
    );
    const request = requestResult.rows[0];
    if (!request) throw new Error("invalid");

    if (user.role === "division_head") {
      if (request.division_id !== user.division_id) throw new Error("forbidden");
      if (request.status !== "pending") throw new Error("invalid");
      const level = "leader";
      const nextStatus = decision === "approved" ? "approved_by_leader" : "rejected";

      await client.query(
        `INSERT INTO leave_approvals
           (request_id, approver_id, level, decision, notes)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (request_id, level) DO NOTHING`,
        [requestId, user.id, level, decision, notes || null],
      );
      await client.query(
        "UPDATE leave_requests SET status = $2 WHERE id = $1",
        [requestId, nextStatus],
      );
    } else if (user.role === "hrd") {
      if (request.status !== "approved_by_leader") {
        throw new Error("invalid");
      }
      if (user.role === "division_head") throw new Error("forbidden");
      await client.query(
        `INSERT INTO leave_approvals
           (request_id, approver_id, level, decision, notes)
         VALUES ($1,$2,'hrd',$3,$4)
         ON CONFLICT (request_id, level) DO NOTHING`,
        [requestId, user.id, decision, notes || null],
      );
      await client.query(
        "UPDATE leave_requests SET status = $2 WHERE id = $1",
        [requestId, decision === "approved" ? "approved" : "rejected"],
      );
    } else {
      throw new Error("forbidden");
    }
  }).catch((error) => {
    if (error.message === "forbidden") forbidden();
    redirect("/approvals?error=invalid");
  });

  redirect("/approvals?success=decided");
}
