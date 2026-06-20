"use server";

import { EmployeeRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function createEmployeeAction(formData: FormData) {
  await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const maxDiscountPercent = Number(String(formData.get("maxDiscountPercent") ?? "5").replace(",", "."));
  const role = String(formData.get("role") ?? "SELLER") as EmployeeRole;
  if (!name || login.length < 3 || password.length < 6) throw new Error("Укажите имя, логин от 3 символов и пароль от 6 символов");
  const employee = await prisma.employee.create({ data: { name, login, passwordHash: hashPassword(password), role, maxDiscountPercent } });
  await prisma.auditLog.create({ data: { action: "EMPLOYEE_CREATED", entityType: "Employee", entityId: employee.id, actorName: "Владелец", details: { name, login, role } } });
  revalidatePath("/admin/employees");
}

export async function toggleEmployeeAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  const employee = await prisma.employee.update({ where: { id }, data: { active } });
  if (!active) await prisma.employeeSession.deleteMany({ where: { employeeId: id } });
  await prisma.auditLog.create({ data: { action: active ? "EMPLOYEE_ENABLED" : "EMPLOYEE_DISABLED", entityType: "Employee", entityId: id, actorName: "Владелец", details: { name: employee.name } } });
  revalidatePath("/admin/employees");
}

export async function resetEmployeePasswordAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) throw new Error("Пароль должен содержать минимум 6 символов");
  await prisma.$transaction([prisma.employee.update({ where: { id }, data: { passwordHash: hashPassword(password) } }), prisma.employeeSession.deleteMany({ where: { employeeId: id } }), prisma.auditLog.create({ data: { action: "EMPLOYEE_PASSWORD_RESET", entityType: "Employee", entityId: id, actorName: "Владелец" } })]);
  revalidatePath("/admin/employees");
}
