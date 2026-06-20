import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActionState = {
  ok: boolean;
  message: string;
  version: number;
};

export const initialActionState: ActionState = {
  ok: false,
  message: "",
  version: 0,
};

export function decimalFromForm(formData: FormData, key: string, label: string) {
  const rawValue = String(formData.get(key) ?? "").trim().replace(",", ".");
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label}: введите число больше нуля`);
  }

  return new Prisma.Decimal(rawValue);
}

export function stringFromForm(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function recordSale(input: {
  productId: string;
  quantity: Prisma.Decimal;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      throw new Error("Товар не найден");
    }

    if (product.stock.lessThan(input.quantity)) {
      throw new Error("Недостаточно товара на складе. Обратитесь к администратору.");
    }

    const total = product.price.mul(input.quantity);

    const sale = await tx.sale.create({
      data: {
        total,
        note: input.note || null,
        items: {
          create: {
            productId: product.id,
            quantity: input.quantity,
            unitPrice: product.price,
            unitCost: product.cost,
            total,
          },
        },
      },
      include: {
        items: true,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: {
        stock: {
          decrement: input.quantity,
        },
      },
    });

    return sale;
  });
}

export async function recordPurchase(input: {
  productId: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      throw new Error("Товар не найден");
    }

    const total = input.unitCost.mul(input.quantity);
    const currentStock = product.stock.greaterThan(0) ? product.stock : new Prisma.Decimal(0);
    const nextStock = currentStock.plus(input.quantity);
    const nextCost = nextStock.equals(0)
      ? input.unitCost
      : product.cost.mul(currentStock).plus(total).div(nextStock);

    const purchase = await tx.purchase.create({
      data: {
        total,
        note: input.note || null,
        items: {
          create: {
            productId: product.id,
            quantity: input.quantity,
            unitCost: input.unitCost,
            total,
          },
        },
      },
      include: {
        items: true,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: {
        stock: {
          increment: input.quantity,
        },
        cost: nextCost.toDecimalPlaces(2),
      },
    });

    return purchase;
  });
}

export function actionError(error: unknown): ActionState {
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Не удалось выполнить операцию",
    version: Date.now(),
  };
}

export function actionSuccess(message: string): ActionState {
  return {
    ok: true,
    message,
    version: Date.now(),
  };
}
