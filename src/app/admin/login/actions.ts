"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminSecret } from "@/lib/admin-auth";

export async function loginAction(formData: FormData) {
  const secret = getAdminSecret();
  const input = String(formData.get("secret") ?? "").trim();

  if (!secret) {
    redirect("/admin/login?missing_secret=1");
  }

  if (input !== secret) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 12,
  });

  redirect("/admin");
}
