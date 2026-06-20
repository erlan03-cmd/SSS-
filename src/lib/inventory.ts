import { PaymentMethod, Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SaleReceipt = {
  id: string;
  receiptNumber: string;
  total: number;
  sellerName: string;
};

export type ActionState = {
  ok: boolean;
  message: string;
  version: number;
  receipt?: SaleReceipt;
};

export const initialActionState: ActionState = { ok: false, message: "", version: 0 };

export function decimalFromForm(formData: FormData, key: string, label: string, allowZero = false) {
  const rawValue = String(formData.get(key) ?? "").trim().replace(",", ".");
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`${label}: введите корректное число`);
  }
  return new Prisma.Decimal(rawValue);
}

export function stringFromForm(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function receiptNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ЧЕК-${stamp}-${random}`;
}

export async function checkoutSale(input: {
  employeeId: string;
  sellerName: string;
  items: Array<{ productId: string; quantity: number }>;
  discountPercent: number;
  paymentMethod: PaymentMethod;
  note?: string;
}) {
  if (!input.items.length) throw new Error("Корзина пуста");

  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee?.active || employee.deletedAt) {
      throw new Error("Аккаунт продавца отключён");
    }

    const discount = new Prisma.Decimal(input.discountPercent || 0);
    if (discount.lessThan(0) || discount.greaterThan(employee.maxDiscountPercent)) {
      throw new Error(`Разрешённая скидка: до ${employee.maxDiscountPercent}%`);
    }

    const uniqueIds = [...new Set(input.items.map((item) => item.productId))];
    if (uniqueIds.length !== input.items.length) throw new Error("В корзине есть повторяющиеся позиции");

    const products = await tx.product.findMany({ where: { id: { in: uniqueIds }, active: true } });
    if (products.length !== input.items.length) throw new Error("Один из товаров не найден или отключён");
    const productMap = new Map(products.map((product) => [product.id, product]));

    let subtotal = new Prisma.Decimal(0);
    const prepared = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const quantity = new Prisma.Decimal(item.quantity);
      if (!quantity.isPositive()) throw new Error(`Некорректное количество: ${product.name}`);
      const discountedPrice = product.price.mul(new Prisma.Decimal(100).minus(discount)).div(100).toDecimalPlaces(2);
      if (discountedPrice.lessThan(product.cost)) {
        throw new Error(`Скидка опускает «${product.name}» ниже закупочной цены`);
      }
      const total = discountedPrice.mul(quantity).toDecimalPlaces(2);
      subtotal = subtotal.plus(product.price.mul(quantity));
      return { product, quantity, unitPrice: discountedPrice, total };
    });

    const discountAmount = subtotal.mul(discount).div(100).toDecimalPlaces(2);
    const total = prepared.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
    const number = receiptNumber();
    const sale = await tx.sale.create({
      data: {
        receiptNumber: number,
        subtotal,
        discountPercent: discount,
        discountAmount,
        total,
        paymentMethod: input.paymentMethod,
        note: input.note || null,
        employeeId: employee.id,
        items: {
          create: prepared.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.product.cost,
            total: item.total,
          })),
        },
      },
    });

    for (const item of prepared) {
      const updated = await tx.product.updateMany({
        where: { id: item.product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) throw new Error(`Недостаточно остатка: ${item.product.name}`);
      const stockAfter = item.product.stock.minus(item.quantity);
      await tx.stockMovement.create({
        data: {
          type: StockMovementType.SALE,
          quantity: item.quantity.negated(),
          stockBefore: item.product.stock,
          stockAfter,
          productId: item.product.id,
          employeeId: employee.id,
          saleId: sale.id,
          note: number,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: "SALE_CREATED",
        entityType: "Sale",
        entityId: sale.id,
        actorName: input.sellerName,
        employeeId: employee.id,
        details: { receiptNumber: number, total: total.toString(), discount: discount.toString(), paymentMethod: input.paymentMethod },
      },
    });

    return { id: sale.id, receiptNumber: number, total: total.toNumber(), sellerName: input.sellerName };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordPurchase(input: {
  productId: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  note?: string;
  supplierId?: string;
  employeeId?: string;
  actorName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error("Товар не найден");
    const total = input.unitCost.mul(input.quantity);
    const nextStock = product.stock.plus(input.quantity);
    const nextCost = nextStock.equals(0)
      ? input.unitCost
      : product.cost.mul(product.stock).plus(total).div(nextStock);
    const purchase = await tx.purchase.create({
      data: {
        total,
        note: input.note || null,
        supplierId: input.supplierId || product.supplierId,
        employeeId: input.employeeId,
        items: { create: { productId: product.id, quantity: input.quantity, unitCost: input.unitCost, total } },
      },
    });
    await tx.product.update({ where: { id: product.id }, data: { stock: { increment: input.quantity }, cost: nextCost.toDecimalPlaces(2) } });
    await tx.stockMovement.create({
      data: {
        type: StockMovementType.PURCHASE,
        quantity: input.quantity,
        stockBefore: product.stock,
        stockAfter: nextStock,
        productId: product.id,
        employeeId: input.employeeId,
        purchaseId: purchase.id,
        note: input.note,
      },
    });
    await tx.auditLog.create({
      data: { action: "STOCK_RECEIVED", entityType: "Product", entityId: product.id, actorName: input.actorName || "Владелец", employeeId: input.employeeId, details: { quantity: input.quantity.toString(), unitCost: input.unitCost.toString() } },
    });
    return purchase;
  });
}

export async function adjustStock(input: {
  productId: string;
  quantity: Prisma.Decimal;
  type: StockMovementType;
  note: string;
  actorName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new Error("Товар не найден");
    const signed = input.type === StockMovementType.WRITE_OFF ? input.quantity.negated() : input.quantity;
    const stockAfter = product.stock.plus(signed);
    if (stockAfter.isNegative()) throw new Error("Остаток не может быть отрицательным");
    await tx.product.update({ where: { id: product.id }, data: { stock: stockAfter } });
    await tx.stockMovement.create({
      data: { type: input.type, quantity: signed, stockBefore: product.stock, stockAfter, productId: product.id, note: input.note },
    });
    await tx.auditLog.create({
      data: { action: `STOCK_${input.type}`, entityType: "Product", entityId: product.id, actorName: input.actorName || "Владелец", details: { quantity: signed.toString(), note: input.note } },
    });
  });
}

export function actionError(error: unknown): ActionState {
  return { ok: false, message: error instanceof Error ? error.message : "Не удалось выполнить операцию", version: Date.now() };
}

export function actionSuccess(message: string, receipt?: SaleReceipt): ActionState {
  return { ok: true, message, version: Date.now(), receipt };
}
