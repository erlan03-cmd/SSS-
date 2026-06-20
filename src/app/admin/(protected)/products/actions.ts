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
    },
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

  await prisma.product.update({
    where: { id },
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
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/cash");
  redirect("/admin/products");
}
