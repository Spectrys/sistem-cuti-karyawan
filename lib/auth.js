import bcrypt from "bcrypt";
import { errors, SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const allowedRoles = new Set(["admin", "employee", "division_head", "hrd"]);

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET wajib diatur dan memiliki minimal 32 karakter.");
  }
  return new TextEncoder().encode(secret);
}

export async function authenticate(username, password) {
  const result = await db.query(
    `SELECT id, username, email, password_hash, full_name, role, division_id
     FROM users
     WHERE username = $1`,
    [username],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;

  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function createSessionToken(user) {
  return new SignJWT({
    userId: user.id,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      !Number.isInteger(payload.userId) ||
      typeof payload.role !== "string" ||
      !allowedRoles.has(payload.role)
    ) {
      return null;
    }

    return { userId: payload.userId, role: payload.role };
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}