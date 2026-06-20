"use server";

import { ReorderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function setOrderStatusAction(formData: FormData) {
  await assertAdmin();
  const productId = String(formData.get("productId") ?? "");
  const status = String(formData.get("status") ?? "NEEDS_ORDER") as ReorderStatus;
  const quantity = Number(String(formData.get("recommendedQty") ?? "0").replace(",", "."));
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  await prisma.reorderItem.upsert({
    where: { productId },
    update: { status, recommendedQty: quantity || product.recommendedOrderQty || product.minStock, supplierId: product.supplierId, orderedAt: status === "ORDERED" ? new Date() : undefined, receivedAt: status === "RECEIVED" ? new Date() : undefined },
    create: { productId, status, recommendedQty: quantity || product.recommendedOrderQty || product.minStock, supplierId: product.supplierId, orderedAt: status === "ORDERED" ? new Date() : null, receivedAt: status === "RECEIVED" ? new Date() : null },
  });
  await prisma.auditLog.create({ data: { action: `REORDER_${status}`, entityType: "Product", entityId: productId, actorName: "Владелец", details: { quantity } } });
  revalidatePath("/admin/orders");
}
