import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

export type CashProduct = {
  id: string;
  name: string;
  barcode: string | null;
  categoryName: string;
  price: number;
  unit: string;
  stockStatus: "available" | "low" | "out";
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
    include: {
      category: true,
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    categoryName: product.category.name,
    price: toNumber(product.price),
    unit: product.unit,
    stockStatus: product.stock.lte(0)
      ? "out"
      : product.stock.lte(product.minStock)
        ? "low"
        : "available",
  }));
}

export async function getRecentOperations(limit = 10): Promise<OperationHistoryItem[]> {
  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
    prisma.purchase.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
  ]);

  return [
    ...sales.map((sale) => ({
      id: sale.id,
      type: "sale" as const,
      createdAt: sale.createdAt.toISOString(),
      total: toNumber(sale.total),
      title: "Продажа",
      details: sale.items
        .map((item) => `${item.product.name} x ${toNumber(item.quantity)} ${item.product.unit}`)
        .join(", "),
    })),
    ...purchases.map((purchase) => ({
      id: purchase.id,
      type: "purchase" as const,
      createdAt: purchase.createdAt.toISOString(),
      total: toNumber(purchase.total),
      title: "Закупка",
      details: purchase.items
        .map((item) => `${item.product.name} x ${toNumber(item.quantity)} ${item.product.unit}`)
        .join(", "),
    })),
  ]
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))
    .slice(0, limit);
}

export async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [products, todaySales, monthSales, monthSaleItems] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        total: true,
      },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        total: true,
      },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: {
            gte: monthStart,
          },
        },
      },
      include: {
        product: true,
      },
    }),
  ]);

  const inventoryCost = products.reduce(
    (sum, product) => sum.plus(product.stock.mul(product.cost)),
    new Prisma.Decimal(0),
  );
  const inventoryRetail = products.reduce(
    (sum, product) => sum.plus(product.stock.mul(product.price)),
    new Prisma.Decimal(0),
  );
  const monthProfit = monthSaleItems.reduce(
    (sum, item) => sum.plus(item.unitPrice.minus(item.unitCost).mul(item.quantity)),
    new Prisma.Decimal(0),
  );

  return {
    inventoryCost: toNumber(inventoryCost),
    inventoryRetail: toNumber(inventoryRetail),
    todaySales: toNumber(todaySales._sum.total),
    monthSales: toNumber(monthSales._sum.total),
    monthProfit: toNumber(monthProfit),
    lowStockProducts: products
      .filter((product) => product.stock.lte(product.minStock))
      .map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.category.name,
        stock: toNumber(product.stock),
        minStock: toNumber(product.minStock),
        unit: product.unit,
      })),
  };
}

export async function getAdminProducts() {
  return prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProductForEdit(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });
}

export async function getFullHistory(limit = 100) {
  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
    prisma.purchase.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
  ]);

  return [
    ...sales.map((sale) => ({
      id: sale.id,
      type: "sale" as const,
      createdAt: sale.createdAt,
      total: sale.total,
      items: sale.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        total: item.total,
      })),
    })),
    ...purchases.map((purchase) => ({
      id: purchase.id,
      type: "purchase" as const,
      createdAt: purchase.createdAt,
      total: purchase.total,
      items: purchase.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.total,
      })),
    })),
  ].sort((left, right) => +right.createdAt - +left.createdAt);
}
