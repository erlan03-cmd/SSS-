"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function approveReturnAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  await prisma.$transaction(async (tx) => {
    const request = await tx.returnRequest.findUnique({ where: { id }, include: { sale: { include: { items: { include: { product: true } } } } } });
    if (!request || request.status !== "PENDING") throw new Error("Запрос уже обработан");
    for (const item of request.sale.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      await tx.stockMovement.create({ data: { type: "RETURN", quantity: item.quantity, stockBefore: item.product.stock, stockAfter: item.product.stock.plus(item.quantity), productId: item.productId, saleId: request.saleId, note: `Возврат ${request.sale.receiptNumber || request.sale.id}` } });
    }
    await tx.returnRequest.update({ where: { id }, data: { status: "APPROVED", processedAt: new Date(), adminNote } });
    await tx.sale.update({ where: { id: request.saleId }, data: { status: "RETURNED" } });
    await tx.auditLog.create({ data: { action: "RETURN_APPROVED", entityType: "Sale", entityId: request.saleId, actorName: "Владелец", details: { requestId: id, adminNote } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath("/admin/returns"); revalidatePath("/admin"); revalidatePath("/cash");
}

export async function rejectReturnAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const request = await prisma.returnRequest.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([prisma.returnRequest.update({ where: { id }, data: { status: "REJECTED", processedAt: new Date(), adminNote } }), prisma.sale.update({ where: { id: request.saleId }, data: { status: "COMPLETED" } }), prisma.auditLog.create({ data: { action: "RETURN_REJECTED", entityType: "Sale", entityId: request.saleId, actorName: "Владелец", details: { requestId: id, adminNote } } })]);
  revalidatePath("/admin/returns"); revalidatePath("/admin");
}
