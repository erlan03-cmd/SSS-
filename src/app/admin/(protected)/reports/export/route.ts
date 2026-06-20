import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

function cell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET() {
  await assertAdmin();
  const sales = await prisma.sale.findMany({ include: { employee: true, items: { include: { product: true } } }, orderBy: { createdAt: "desc" } });
  const rows = [["Дата", "Чек", "Продавец", "Оплата", "Статус", "Товар", "Количество", "Цена", "Сумма"]];
  for (const sale of sales) for (const item of sale.items) rows.push([sale.createdAt.toLocaleString("ru-RU"), sale.receiptNumber || sale.id, sale.employee?.name || "", sale.paymentMethod, sale.status, item.product.name, item.quantity.toString(), item.unitPrice.toString(), item.total.toString()]);
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}`;
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sales-report.csv"' } });
}
