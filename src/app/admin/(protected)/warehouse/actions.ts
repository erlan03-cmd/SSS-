"use server";

import { StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { adjustStock, decimalFromForm, recordPurchase, stringFromForm } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export async function receiveStockAction(formData: FormData) {
  await assertAdmin();
  await recordPurchase({
    productId: stringFromForm(formData, "productId"),
    quantity: decimalFromForm(formData, "quantity", "Количество"),
    unitCost: decimalFromForm(formData, "unitCost", "Закупочная цена"),
    supplierId: stringFromForm(formData, "supplierId") || undefined,
    note: stringFromForm(formData, "note"),
    actorName: "Владелец",
  });
  revalidatePath("/admin/warehouse"); revalidatePath("/admin"); revalidatePath("/cash");
}

export async function writeOffStockAction(formData: FormData) {
  await assertAdmin();
  await adjustStock({ productId: stringFromForm(formData, "productId"), quantity: decimalFromForm(formData, "quantity", "Количество"), type: StockMovementType.WRITE_OFF, note: stringFromForm(formData, "note") || "Списание брака" });
  revalidatePath("/admin/warehouse"); revalidatePath("/admin"); revalidatePath("/cash");
}

export async function inventoryStockAction(formData: FormData) {
  await assertAdmin();
  const productId = stringFromForm(formData, "productId");
  const actual = decimalFromForm(formData, "actualStock", "Фактический остаток", true);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const difference = actual.minus(product.stock);
  if (!difference.equals(0)) {
    await adjustStock({ productId, quantity: difference, type: StockMovementType.INVENTORY, note: stringFromForm(formData, "note") || "Инвентаризация" });
  }
  revalidatePath("/admin/warehouse"); revalidatePath("/admin"); revalidatePath("/cash");
}

export async function createSupplierAction(formData: FormData) {
  await assertAdmin();
  const name = stringFromForm(formData, "name");
  if (!name) return;
  await prisma.supplier.upsert({ where: { name }, update: { phone: stringFromForm(formData, "phone") || null }, create: { name, phone: stringFromForm(formData, "phone") || null } });
  revalidatePath("/admin/warehouse");
}
