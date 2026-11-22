"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, createSessionToken } from "@/lib/auth";

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
