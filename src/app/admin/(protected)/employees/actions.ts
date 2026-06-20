"use server";

import { EmployeeRole, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const employeesPath = "/admin/employees";
const loginPattern = /^[a-z0-9._-]{3,32}$/;

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function employeeRole(formData: FormData) {
  const role = field(formData, "role");
  return role === EmployeeRole.ADMIN ? EmployeeRole.ADMIN : EmployeeRole.SELLER;
}

function discountPercent(formData: FormData) {
  const value = Number(field(formData, "maxDiscountPercent").replace(",", "."));
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function isDuplicateLogin(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function refreshEmployees() {
  revalidatePath(employeesPath);
  revalidatePath("/cash");
}

export async function createEmployeeAction(formData: FormData) {
  await assertAdmin();

  const name = field(formData, "name");
  const login = field(formData, "login").toLowerCase();
  const password = field(formData, "password");
  const role = employeeRole(formData);
  const maxDiscountPercent = discountPercent(formData);

  if (!name || !loginPattern.test(login) || password.length < 6 || maxDiscountPercent === null) {
    redirect(`${employeesPath}?error=invalid`);
  }

  let duplicate = false;
  try {
    const employee = await prisma.employee.create({
      data: { name, login, passwordHash: hashPassword(password), role, maxDiscountPercent },
    });
    await prisma.auditLog.create({
      data: {
        action: "EMPLOYEE_CREATED",
        entityType: "Employee",
        entityId: employee.id,
        actorName: "Владелец",
        details: { name, login, role, maxDiscountPercent },
      },
    });
  } catch (error) {
    if (isDuplicateLogin(error)) duplicate = true;
    else throw error;
  }

  if (duplicate) redirect(`${employeesPath}?error=login_taken`);
  refreshEmployees();
  redirect(`${employeesPath}?success=created`);
}

export async function updateEmployeeAction(formData: FormData) {
  await assertAdmin();

  const id = field(formData, "id");
  const name = field(formData, "name");
  const login = field(formData, "login").toLowerCase();
  const role = employeeRole(formData);
  const maxDiscountPercent = discountPercent(formData);

  if (!id || !name || !loginPattern.test(login) || maxDiscountPercent === null) {
    redirect(`${employeesPath}?error=invalid`);
  }

  const current = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!current) redirect(`${employeesPath}?error=not_found`);

  let duplicate = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { name, login, role, maxDiscountPercent },
      });

      if (current.login !== login || current.role !== role) {
        await tx.employeeSession.deleteMany({ where: { employeeId: id } });
      }

      await tx.auditLog.create({
        data: {
          action: "EMPLOYEE_UPDATED",
          entityType: "Employee",
          entityId: id,
          actorName: "Владелец",
          details: {
            before: {
              name: current.name,
              login: current.login,
              role: current.role,
              maxDiscountPercent: current.maxDiscountPercent.toString(),
            },
            after: { name, login, role, maxDiscountPercent },
          },
        },
      });
    });
  } catch (error) {
    if (isDuplicateLogin(error)) duplicate = true;
    else throw error;
  }

  if (duplicate) redirect(`${employeesPath}?error=login_taken`);
  refreshEmployees();
  redirect(`${employeesPath}?success=updated`);
}

export async function toggleEmployeeAction(formData: FormData) {
  await assertAdmin();

  const id = field(formData, "id");
  const active = field(formData, "active") === "true";
  const current = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!current) redirect(`${employeesPath}?error=not_found`);

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data: { active } });
    if (!active) await tx.employeeSession.deleteMany({ where: { employeeId: id } });
    await tx.auditLog.create({
      data: {
        action: active ? "EMPLOYEE_ENABLED" : "EMPLOYEE_DISABLED",
        entityType: "Employee",
        entityId: id,
        actorName: "Владелец",
        details: { name: current.name, login: current.login },
      },
    });
  });

  refreshEmployees();
  redirect(`${employeesPath}?success=${active ? "enabled" : "disabled"}`);
}

export async function resetEmployeePasswordAction(formData: FormData) {
  await assertAdmin();

  const id = field(formData, "id");
  const password = field(formData, "password");
  const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!employee) redirect(`${employeesPath}?error=not_found`);
  if (password.length < 6) redirect(`${employeesPath}?error=password_short`);

  await prisma.$transaction([
    prisma.employee.update({ where: { id }, data: { passwordHash: hashPassword(password) } }),
    prisma.employeeSession.deleteMany({ where: { employeeId: id } }),
    prisma.auditLog.create({
      data: {
        action: "EMPLOYEE_PASSWORD_RESET",
        entityType: "Employee",
        entityId: id,
        actorName: "Владелец",
        details: { name: employee.name, login: employee.login },
      },
    }),
  ]);

  refreshEmployees();
  redirect(`${employeesPath}?success=password`);
}

export async function deleteEmployeeAction(formData: FormData) {
  await assertAdmin();

  const id = field(formData, "id");
  const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!employee) redirect(`${employeesPath}?error=not_found`);

  const deletedAt = new Date();
  const archivedLogin = `deleted-${deletedAt.getTime()}-${id}`;

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id },
      data: { active: false, deletedAt, login: archivedLogin },
    });
    await tx.employeeSession.deleteMany({ where: { employeeId: id } });
    await tx.heldReceipt.deleteMany({ where: { employeeId: id } });
    await tx.auditLog.create({
      data: {
        action: "EMPLOYEE_DELETED",
        entityType: "Employee",
        entityId: id,
        actorName: "Владелец",
        details: { name: employee.name, login: employee.login, role: employee.role },
      },
    });
  });

  refreshEmployees();
  redirect(`${employeesPath}?success=deleted`);
}
