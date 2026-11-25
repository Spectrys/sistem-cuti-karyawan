import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("leave_session")?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const result = await db.query(
    `SELECT id, username, full_name, role, division_id, annual_quota
     FROM users
     WHERE id = $1`,
    [session.userId],
  );

  return result.rows[0] ?? null;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") forbidden();
  return user;
}
