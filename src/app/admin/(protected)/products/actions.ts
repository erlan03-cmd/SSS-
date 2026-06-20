"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key);

  if (!value) {
    throw new Error(`${label}: поле обязательно`);
  }

  return value;
}

function decimal(
  formData: FormData,
  key: string,
  label: string,
  options: { allowZero?: boolean } = {},
) {
  const rawValue = text(formData, key).replace(",", ".");
  const parsed = Number(rawValue);
  const min = options.allowZero ? 0 : Number.MIN_VALUE;

  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`${label}: введите корректное число`);
  }

  return new Prisma.Decimal(rawValue);
}

function optionalDecimal(formData: FormData, key: string) {
  const rawValue = text(formData, key).replace(",", ".");
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key}: введите корректное число`);
  return new Prisma.Decimal(rawValue);
}

function productDetails(formData: FormData) {
  const temperature = text(formData, "colorTemperatureK");
  return {
    imageUrl: text(formData, "imageUrl") || null,
    subcategory: text(formData, "subcategory") || null,
    brand: text(formData, "brand") || null,
    sku: text(formData, "sku") || null,
    supplierId: text(formData, "supplierId") || null,
    warehouse: text(formData, "warehouse") || null,
    rack: text(formData, "rack") || null,
    shelf: text(formData, "shelf") || null,
    description: text(formData, "description") || null,
    recommendedOrderQty: optionalDecimal(formData, "recommendedOrderQty") ?? new Prisma.Decimal(0),
    powerW: optionalDecimal(formData, "powerW"),
    voltageV: text(formData, "voltageV") || null,
    socketType: text(formData, "socketType") || null,
    lightColor: text(formData, "lightColor") || null,
    colorTemperatureK: temperature ? Number.parseInt(temperature, 10) : null,
    ipRating: text(formData, "ipRating") || null,
    size: text(formData, "size") || null,
    color: text(formData, "color") || null,
    material: text(formData, "material") || null,
    cableLengthM: optionalDecimal(formData, "cableLengthM"),
    wireSectionMm2: optionalDecimal(formData, "wireSectionMm2"),
  };
}

async function uniqueProductSlug(baseSlug: string, exceptId?: string) {
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.product.findFirst({
      where: {
        slug,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function createProductAction(formData: FormData) {
  await assertAdmin();

  const name = requiredText(formData, "name", "Название");
  const slug = await uniqueProductSlug(slugify(text(formData, "slug") || name));
  const categoryId = requiredText(formData, "categoryId", "Категория");
  const barcode = text(formData, "barcode") || null;

  await prisma.product.create({
    data: {
      name,
      slug,
      barcode,
      categoryId,
      unit: requiredText(formData, "unit", "Единица"),
      price: decimal(formData, "price", "Цена продажи"),
      cost: decimal(formData, "cost", "Себестоимость", { allowZero: true }),
      stock: decimal(formData, "stock", "Остаток", { allowZero: true }),
      minStock: decimal(formData, "minStock", "Минимальный остаток", {
        allowZero: true,
      }),
      ...productDetails(formData),
    },
  });

  await prisma.auditLog.create({
    data: { action: "PRODUCT_CREATED", entityType: "Product", actorName: "Владелец", details: { name, barcode } },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/cash");
  redirect("/admin/products");
}

export async function updateProductAction(formData: FormData) {
  await assertAdmin();

  const id = requiredText(formData, "id", "ID товара");
  const name = requiredText(formData, "name", "Название");
  const slug = await uniqueProductSlug(slugify(text(formData, "slug") || name), id);
  const categoryId = requiredText(formData, "categoryId", "Категория");
  const barcode = text(formData, "barcode") || null;

  const nextStock = decimal(formData, "stock", "Остаток", { allowZero: true });
  await prisma.$transaction(async (tx) => {
    const previous = await tx.product.findUniqueOrThrow({ where: { id } });
    await tx.product.update({ where: { id }, data: {
      name,
      slug,
      barcode,
      categoryId,
      unit: requiredText(formData, "unit", "Единица"),
      price: decimal(formData, "price", "Цена продажи"),
      cost: decimal(formData, "cost", "Себестоимость", { allowZero: true }),
      stock: nextStock,
      minStock: decimal(formData, "minStock", "Минимальный остаток", {
        allowZero: true,
      }),
      ...productDetails(formData),
    } });
    if (!previous.stock.equals(nextStock)) {
      await tx.stockMovement.create({ data: { type: "ADJUSTMENT", quantity: nextStock.minus(previous.stock), stockBefore: previous.stock, stockAfter: nextStock, productId: id, note: "Изменение в карточке товара" } });
    }
    await tx.auditLog.create({ data: { action: "PRODUCT_UPDATED", entityType: "Product", entityId: id, actorName: "Владелец", details: { name, stockBefore: previous.stock.toString(), stockAfter: nextStock.toString() } } });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/cash");
  redirect("/admin/products");
}
