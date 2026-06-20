import { PaymentMethod, Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

export type CashProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  barcode: string | null;
  sku: string | null;
  brand: string | null;
  categoryName: string;
  categorySlug: string;
  subcategory: string | null;
  price: number;
  unit: string;
  stock: number;
  minStock: number;
  stockStatus: "available" | "low" | "out";
  specifications: string[];
};

export type OperationHistoryItem = {
  id: string;
  type: "sale" | "purchase";
  createdAt: string;
  total: number;
  title: string;
  details: string;
};

export async function getCashProducts(): Promise<CashProduct[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return products.map((product) => {
    const specifications = [
      product.powerW ? `${toNumber(product.powerW)} W` : null,
      product.socketType,
      product.colorTemperatureK ? `${product.colorTemperatureK}K` : null,
      product.ipRating,
      product.voltageV,
      product.wireSectionMm2 ? `${toNumber(product.wireSectionMm2)} мм²` : null,
      product.cableLengthM ? `${toNumber(product.cableLengthM)} м` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      barcode: product.barcode,
      sku: product.sku,
      brand: product.brand,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      subcategory: product.subcategory,
      price: toNumber(product.price),
      unit: product.unit,
      stock: toNumber(product.stock),
      minStock: toNumber(product.minStock),
      stockStatus: product.stock.lte(0)
        ? "out"
        : product.stock.lte(product.minStock)
          ? "low"
          : "available",
      specifications,
    };
  });
}

export async function getRecentOperations(limit = 10): Promise<OperationHistoryItem[]> {
  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { employee: true, items: { include: { product: true } } },
    }),
    prisma.purchase.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } } },
    }),
  ]);

  return [
    ...sales.map((sale) => ({
      id: sale.id,
      type: "sale" as const,
      createdAt: sale.createdAt.toISOString(),
      total: toNumber(sale.total),
      title: sale.receiptNumber || "Продажа",
      details: `${sale.employee?.name || "Без продавца"}: ${sale.items
        .map((item) => `${item.product.name} × ${toNumber(item.quantity)}`)
        .join(", ")}`,
    })),
    ...purchases.map((purchase) => ({
      id: purchase.id,
      type: "purchase" as const,
      createdAt: purchase.createdAt.toISOString(),
      total: toNumber(purchase.total),
      title: "Поступление",
      details: purchase.items.map((item) => `${item.product.name} × ${toNumber(item.quantity)}`).join(", "),
    })),
  ]
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))
    .slice(0, limit);
}

export async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [products, todaySales, monthItems, pendingReturns] = await Promise.all([
    prisma.product.findMany({ include: { category: true, supplier: true }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: { createdAt: { gte: todayStart }, status: SaleStatus.COMPLETED },
      include: { employee: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: monthStart }, status: SaleStatus.COMPLETED } },
      include: { product: true, sale: true },
    }),
    prisma.returnRequest.count({ where: { status: "PENDING" } }),
  ]);

  const inventoryCost = products.reduce((sum, product) => sum.plus(product.stock.mul(product.cost)), new Prisma.Decimal(0));
  const inventoryRetail = products.reduce((sum, product) => sum.plus(product.stock.mul(product.price)), new Prisma.Decimal(0));
  const revenueToday = todaySales.reduce((sum, sale) => sum.plus(sale.total), new Prisma.Decimal(0));
  const profitToday = todaySales.flatMap((sale) => sale.items).reduce(
    (sum, item) => sum.plus(item.unitPrice.minus(item.unitCost).mul(item.quantity)),
    new Prisma.Decimal(0),
  );
  const monthSales = monthItems.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
  const monthProfit = monthItems.reduce(
    (sum, item) => sum.plus(item.unitPrice.minus(item.unitCost).mul(item.quantity)),
    new Prisma.Decimal(0),
  );

  const paymentTotals: Record<PaymentMethod, number> = { CASH: 0, CARD: 0, QR: 0, TRANSFER: 0 };
  for (const sale of todaySales) paymentTotals[sale.paymentMethod] += toNumber(sale.total);

  const sellerMap = new Map<string, { name: string; total: number; count: number }>();
  const productMap = new Map<string, { name: string; quantity: number; total: number }>();
  for (const sale of todaySales) {
    const seller = sale.employee?.name || "Без продавца";
    const currentSeller = sellerMap.get(seller) || { name: seller, total: 0, count: 0 };
    currentSeller.total += toNumber(sale.total);
    currentSeller.count += 1;
    sellerMap.set(seller, currentSeller);
    for (const item of sale.items) {
      const current = productMap.get(item.productId) || { name: item.product.name, quantity: 0, total: 0 };
      current.quantity += toNumber(item.quantity);
      current.total += toNumber(item.total);
      productMap.set(item.productId, current);
    }
  }

  return {
    inventoryCost: toNumber(inventoryCost),
    inventoryRetail: toNumber(inventoryRetail),
    todaySales: toNumber(revenueToday),
    todayProfit: toNumber(profitToday),
    todaySaleCount: todaySales.length,
    monthSales: toNumber(monthSales),
    monthProfit: toNumber(monthProfit),
    paymentTotals,
    pendingReturns,
    lowStockProducts: products
      .filter((product) => product.stock.lte(product.minStock))
      .map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.category.name,
        stock: toNumber(product.stock),
        minStock: toNumber(product.minStock),
        recommendedOrderQty: toNumber(product.recommendedOrderQty) || Math.max(toNumber(product.minStock) * 2 - toNumber(product.stock), 1),
        supplierName: product.supplier?.name || "Не указан",
        unit: product.unit,
      })),
    recentSales: todaySales.slice(0, 8),
    topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6),
    sellerSales: [...sellerMap.values()].sort((a, b) => b.total - a.total),
  };
}

export async function getAdminProducts() {
  return prisma.product.findMany({
    include: { category: true, supplier: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function getProductForEdit(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { category: true, supplier: true } });
}

export async function getFullHistory(limit = 150) {
  const [sales, purchases, movements, audits] = await Promise.all([
    prisma.sale.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { employee: true, items: { include: { product: true } } },
    }),
    prisma.purchase.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, employee: true, items: { include: { product: true } } },
    }),
    prisma.stockMovement.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { product: true, employee: true },
    }),
    prisma.auditLog.findMany({ take: limit, orderBy: { createdAt: "desc" }, include: { employee: true } }),
  ]);
  return { sales, purchases, movements, audits };
}

export async function getWarehouseData() {
  const [products, movements, suppliers] = await Promise.all([
    getAdminProducts(),
    prisma.stockMovement.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { product: true, employee: true } }),
    getSuppliers(),
  ]);
  return { products, movements, suppliers };
}

export async function getReorderData() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, supplier: true, reorderItem: true },
    orderBy: { name: "asc" },
  });
  return products.filter((product) => product.stock.lte(product.minStock) || product.reorderItem);
}

export async function getEmployees() {
  return prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { sales: true } } },
  });
}

export async function getReturnRequests() {
  return prisma.returnRequest.findMany({
    include: { employee: true, approvedBy: true, sale: { include: { employee: true, items: { include: { product: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReportData(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  const [sales, products, movements] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: from } }, include: { employee: true, items: { include: { product: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ include: { category: true, supplier: true } }),
    prisma.stockMovement.findMany({ where: { createdAt: { gte: from } }, include: { product: true, employee: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return { from, sales, products, movements };
}
