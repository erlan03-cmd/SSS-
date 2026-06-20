import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const EMPLOYEE_COOKIE = "sss_employee_session";
const SESSION_DAYS = 30;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createEmployeeSession(employeeId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.employeeSession.create({
    data: { employeeId, tokenHash: tokenHash(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/cash",
    expires: expiresAt,
  });
}

export async function getCurrentEmployee() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_COOKIE)?.value;

  if (!token) return null;

  const session = await prisma.employeeSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { employee: true },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.employee.active ||
    session.employee.deletedAt
  ) {
    if (session) {
      await prisma.employeeSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.employee;
}

export async function requireEmployee() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/cash/login");
  return employee;
}

export async function destroyEmployeeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_COOKIE)?.value;
  if (token) {
    await prisma.employeeSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
  cookieStore.delete(EMPLOYEE_COOKIE);
}
