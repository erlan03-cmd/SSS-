import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await assertAdmin();

  const [
    categories,
    suppliers,
    employees,
    products,
    sales,
    purchases,
    stockMovements,
    returnRequests,
    reorderItems,
    heldReceipts,
    auditLogs,
  ] = await prisma.$transaction([
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.supplier.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        login: true,
        role: true,
        active: true,
        maxDiscountPercent: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.purchase.findMany({
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.returnRequest.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.reorderItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.heldReceipt.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const createdAt = new Date();
  const backup = {
    format: "sss-operational-backup",
    version: 1,
    createdAt: createdAt.toISOString(),
    security: "Пароли и токены сессий намеренно исключены",
    counts: {
      categories: categories.length,
      suppliers: suppliers.length,
      employees: employees.length,
      products: products.length,
      sales: sales.length,
      purchases: purchases.length,
      stockMovements: stockMovements.length,
      returnRequests: returnRequests.length,
      auditLogs: auditLogs.length,
    },
    data: {
      categories,
      suppliers,
      employees,
      products,
      sales,
      purchases,
      stockMovements,
      returnRequests,
      reorderItems,
      heldReceipts,
      auditLogs,
    },
  };

  await prisma.auditLog.create({
    data: {
      action: "BACKUP_DOWNLOADED",
      entityType: "System",
      actorName: "Владелец",
      details: backup.counts,
    },
  });

  const date = createdAt.toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sss-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
