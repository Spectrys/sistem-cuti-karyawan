"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { parseDateOnly } from "@/lib/leave";

function text(formData, name, maxLength = 255) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function numericValue(value) {
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function leaveTypeValues(formData) {
  const quota = numericValue(text(formData, "quotaPerYear"));
  const minNotice = numericValue(text(formData, "minNoticeDays"));
  const maxBackdate = numericValue(text(formData, "maxBackdateDays"));
  if (quota === undefined || minNotice === undefined || maxBackdate === undefined) return null;

  const code = text(formData, "code", 30).toUpperCase();
  const name = text(formData, "name", 100);
  if (!/^[A-Z0-9_-]+$/.test(code) || !name) return null;

  return {
    code,
    name,
    description: text(formData, "description", 1000) || null,
    quota,
    minNotice,
    maxBackdate,
    requiresAttachment: formData.get("requiresAttachment") === "on",
    deductsQuota: formData.get("deductsAnnualQuota") === "on",
    isActive: formData.get("isActive") === "on",
  };
}

export async function saveLeaveTypeAction(formData) {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const values = leaveTypeValues(formData);
  if (!values) redirect(`/admin/leave-types?error=invalid`);

  try {
    if (id) {
      await db.query(
        `UPDATE leave_types
         SET code=$2, name=$3, description=$4, quota_per_year=$5,
             min_notice_days=$6, max_backdate_days=$7, requires_attachment=$8,
             deducts_annual_quota=$9, is_active=$10
         WHERE id=$1`,
        [
          id, values.code, values.name, values.description, values.quota,
          values.minNotice, values.maxBackdate, values.requiresAttachment,
          values.deductsQuota, values.isActive,
        ],
      );
    } else {
      await db.query(
        `INSERT INTO leave_types
           (code,name,description,quota_per_year,min_notice_days,max_backdate_days,
            requires_attachment,deducts_annual_quota,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          values.code, values.name, values.description, values.quota,
          values.minNotice, values.maxBackdate, values.requiresAttachment,
          values.deductsQuota, values.isActive,
        ],
      );
    }
  } catch (error) {
    if (error.code === "23505") redirect("/admin/leave-types?error=duplicate");
    throw error;
  }

  revalidatePath("/admin/leave-types");
  revalidatePath("/leaves/new");
  redirect("/admin/leave-types?success=saved");
}

export async function deleteLeaveTypeAction(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) redirect("/admin/leave-types?error=invalid");

  const result = await db.query(
    `DELETE FROM leave_types
     WHERE id=$1 AND is_system=FALSE
       AND NOT EXISTS (
         SELECT 1 FROM leave_requests WHERE leave_type_id=$1
       )
     RETURNING id`,
    [id],
  );
  if (!result.rows[0]) redirect("/admin/leave-types?error=protected");
  revalidatePath("/admin/leave-types");
  redirect("/admin/leave-types?success=deleted");
}

function userValues(formData) {
  const annualQuota = numericValue(text(formData, "annualQuota"));
  const role = text(formData, "role", 20);
  const divisionId = Number(formData.get("divisionId")) || null;
  const fullName = text(formData, "fullName", 150);
  const username = text(formData, "username", 50);
  const email = text(formData, "email", 150).toLowerCase();
  const joinDate = text(formData, "joinDate", 10);
  if (
    annualQuota === null || annualQuota === undefined ||
    !["admin", "employee", "division_head", "hrd"].includes(role) ||
    !fullName || !/^[a-zA-Z0-9_.-]{2,50}$/.test(username) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !parseDateOnly(joinDate)
  ) return null;

  return {
    fullName, username, email, role, divisionId, joinDate, annualQuota,
    phone: text(formData, "phone", 30) || null,
    address: text(formData, "address", 500) || null,
  };
}

export async function saveUserAction(formData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const values = userValues(formData);
  const password = String(formData.get("password") ?? "");
  if (!values || (!id && password.length < 8) || (password && password.length < 8)) {
    redirect("/admin/users?error=invalid");
  }
  if (id === admin.id && values.role !== "admin") {
    redirect("/admin/users?error=self");
  }

  try {
    if (id) {
      await db.transaction(async (client) => {
        const params = [
          id, values.username, values.email, values.fullName, values.role,
          values.divisionId, values.joinDate, values.annualQuota,
          values.phone, values.address,
        ];
        let passwordSql = "";
        if (password) {
          passwordSql = ", password_hash=$11";
          params.push(await bcrypt.hash(password, 10));
        }
        await client.query(
          `UPDATE users
           SET username=$2, email=$3, full_name=$4, role=$5, division_id=$6,
               join_date=$7, annual_quota=$8, phone=$9, address=$10${passwordSql}
           WHERE id=$1`,
          params,
        );
        await client.query(
          `UPDATE divisions
           SET leader_id=NULL
           WHERE leader_id=$1 AND ($2 <> 'division_head' OR id IS DISTINCT FROM $3)`,
          [id, values.role, values.divisionId],
        );
      });
    } else {
      await db.query(
        `INSERT INTO users
           (username,email,password_hash,full_name,role,division_id,join_date,
            annual_quota,phone,address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          values.username, values.email, await bcrypt.hash(password, 10),
          values.fullName, values.role, values.divisionId, values.joinDate,
          values.annualQuota, values.phone, values.address,
        ],
      );
    }
  } catch (error) {
    if (error.code === "23505") redirect("/admin/users?error=duplicate");
    if (error.code === "23503") redirect("/admin/users?error=division");
    throw error;
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/divisions");
  revalidatePath("/");
  redirect("/admin/users?success=saved");
}

export async function deleteUserAction(formData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1 || id === admin.id) {
    redirect("/admin/users?error=self");
  }

  const result = await db.query(
    `DELETE FROM users
     WHERE id=$1 AND role <> 'admin'
       AND NOT EXISTS (SELECT 1 FROM leave_requests WHERE user_id=$1)
     RETURNING id`,
    [id],
  );
  if (!result.rows[0]) redirect("/admin/users?error=protected");
  revalidatePath("/admin/users");
  revalidatePath("/admin/divisions");
  redirect("/admin/users?success=deleted");
}

export async function saveDivisionAction(formData) {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const name = text(formData, "name", 100);
  const description = text(formData, "description", 1000) || null;
  const leaderId = Number(formData.get("leaderId")) || null;
  if (!name) redirect(`/admin/divisions${id ? `/${id}` : ""}?error=invalid`);

  try {
    await db.transaction(async (client) => {
      if (leaderId) {
        const leader = await client.query(
          "SELECT role FROM users WHERE id=$1",
          [leaderId],
        );
        if (leader.rows[0]?.role !== "division_head") throw new Error("leader");
      }

      let divisionId = id;
      if (id) {
        await client.query(
          "UPDATE divisions SET name=$2, description=$3, leader_id=NULL WHERE id=$1",
          [id, name, description],
        );
      } else {
        const inserted = await client.query(
          "INSERT INTO divisions (name,description) VALUES ($1,$2) RETURNING id",
          [name, description],
        );
        divisionId = inserted.rows[0].id;
      }

      if (leaderId) {
        await client.query(
          "UPDATE divisions SET leader_id=NULL WHERE leader_id=$1",
          [leaderId],
        );
        await client.query(
          "UPDATE users SET division_id=$2 WHERE id=$1",
          [leaderId, divisionId],
        );
        await client.query(
          "UPDATE divisions SET leader_id=$2 WHERE id=$1",
          [divisionId, leaderId],
        );
      }
    });
  } catch (error) {
    if (error.code === "23505") redirect("/admin/divisions?error=duplicate");
    if (error.message === "leader") redirect(`/admin/divisions${id ? `/${id}` : ""}?error=leader`);
    throw error;
  }

  revalidatePath("/admin/divisions");
  revalidatePath("/admin/users");
  redirect(id ? `/admin/divisions/${id}?success=saved` : "/admin/divisions?success=saved");
}

export async function deleteDivisionAction(formData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) redirect("/admin/divisions?error=invalid");

  const result = await db.query(
    `DELETE FROM divisions
     WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM users WHERE division_id=$1)
     RETURNING id`,
    [id],
  );
  if (!result.rows[0]) redirect("/admin/divisions?error=members");
  revalidatePath("/admin/divisions");
  redirect("/admin/divisions?success=deleted");
}
