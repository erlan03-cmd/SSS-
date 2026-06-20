"use server";

import { redirect } from "next/navigation";
import { createEmployeeSession } from "@/lib/employee-auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function employeeLoginAction(formData: FormData) {
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const employee = await prisma.employee.findUnique({ where: { login } });

  if (
    !employee ||
    !employee.active ||
    employee.deletedAt ||
    !verifyPassword(password, employee.passwordHash)
  ) {
    redirect("/cash/login?error=1");
  }

  await createEmployeeSession(employee.id);
  await prisma.auditLog.create({
    data: {
      action: "LOGIN",
      entityType: "Employee",
      entityId: employee.id,
      actorName: employee.name,
      employeeId: employee.id,
    },
  });
  redirect("/cash");
}
