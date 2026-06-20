import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "sss_admin_access";

export function getAdminSecret() {
  return process.env.ADMIN_SECRET_KEY?.trim();
}

export async function assertAdmin() {
  const secret = getAdminSecret();

  if (!secret) {
    redirect("/admin/login?missing_secret=1");
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE)?.value;

  if (cookieValue !== secret) {
    redirect("/admin/login");
  }
}
