"use server";

import { PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { closeCashShift, openCashShift } from "@/lib/cash-shift";
import { requireEmployee } from "@/lib/employee-auth";
import {
  actionError,
  actionSuccess,
  checkoutSale,
  decimalFromForm,
  stringFromForm,
  type ActionState,
} from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

type CartItemInput = { productId: string; quantity: number };

export async function openShiftAction(formData: FormData) {
  const employee = await requireEmployee();
  await openCashShift({
    employeeId: employee.id,
    employeeName: employee.name,
    openingCash: decimalFromForm(
      formData,
      "openingCash",
      "Размен в кассе",
      true,
    ),
  });
  revalidatePath("/cash");
  revalidatePath("/admin/shifts");
  redirect("/cash?shift=opened");
}

export async function closeShiftAction(formData: FormData) {
  const employee = await requireEmployee();
  await closeCashShift({
    employeeId: employee.id,
    employeeName: employee.name,
    closingCash: decimalFromForm(
      formData,
      "closingCash",
      "Фактические наличные",
      true,
    ),
    note: stringFromForm(formData, "note"),
  });
  revalidatePath("/cash");
  revalidatePath("/admin/shifts");
  revalidatePath("/admin/reports");
  redirect("/cash?shift=closed");
}

function parseCart(raw: FormDataEntryValue | null): CartItemInput[] {
  try {
    const parsed = JSON.parse(String(raw ?? "[]")) as CartItemInput[];
    if (!Array.isArray(parsed)) throw new Error();
    return parsed.map((item) => ({ productId: String(item.productId), quantity: Number(item.quantity) }));
  } catch {
    throw new Error("Не удалось прочитать корзину");
  }
}

export async function checkoutAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const employee = await requireEmployee();
    const items = parseCart(formData.get("items"));
    const discountPercent = Number(String(formData.get("discountPercent") ?? "0").replace(",", "."));
    const paymentValue = String(formData.get("paymentMethod") ?? "CASH") as PaymentMethod;
    const paymentMethod = Object.values(PaymentMethod).includes(paymentValue) ? paymentValue : PaymentMethod.CASH;
    const receipt = await checkoutSale({
      employeeId: employee.id,
      sellerName: employee.name,
      items,
      discountPercent,
      paymentMethod,
      note: String(formData.get("note") ?? "").trim(),
    });
    revalidatePath("/cash");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/shifts");
    return actionSuccess("Продажа оформлена", receipt);
  } catch (error) {
    return actionError(error);
  }
}

export async function holdReceiptAction(input: {
  name: string;
  items: CartItemInput[];
  discountPercent: number;
  paymentMethod: PaymentMethod;
}) {
  const employee = await requireEmployee();
  if (!input.items.length) throw new Error("Корзина пуста");
  await prisma.heldReceipt.create({
    data: {
      name: input.name.trim() || `Чек ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`,
      items: input.items as unknown as Prisma.InputJsonValue,
      discountPercent: input.discountPercent,
      paymentMethod: input.paymentMethod,
      employeeId: employee.id,
    },
  });
  revalidatePath("/cash");
}

export async function deleteHeldReceiptAction(id: string) {
  const employee = await requireEmployee();
  await prisma.heldReceipt.deleteMany({ where: { id, employeeId: employee.id } });
  revalidatePath("/cash");
}

export async function requestReturnAction(formData: FormData) {
  const employee = await requireEmployee();
  const receiptNumber = String(formData.get("receiptNumber") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!receiptNumber || !reason) return;
  const sale = await prisma.sale.findFirst({
    where: { receiptNumber, employeeId: employee.id, status: "COMPLETED" },
  });
  if (!sale) throw new Error("Чек не найден или возврат уже оформлен");
  await prisma.$transaction([
    prisma.returnRequest.create({ data: { saleId: sale.id, employeeId: employee.id, reason } }),
    prisma.sale.update({ where: { id: sale.id }, data: { status: "RETURN_REQUESTED" } }),
    prisma.auditLog.create({ data: { action: "RETURN_REQUESTED", entityType: "Sale", entityId: sale.id, actorName: employee.name, employeeId: employee.id, details: { receiptNumber, reason } } }),
  ]);
  revalidatePath("/cash");
  revalidatePath("/admin/returns");
}
