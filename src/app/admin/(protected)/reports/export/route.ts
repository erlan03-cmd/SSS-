import { assertAdmin } from "@/lib/admin-auth";
import { startOfBishkekPeriod } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const allowedDays = new Set([1, 7, 30]);

const paymentLabels: Record<string, string> = {
  CASH: "Наличные",
  CARD: "Карта",
  QR: "QR-оплата",
  TRANSFER: "Перевод",
};

const statusLabels: Record<string, string> = {
  COMPLETED: "Завершена",
  RETURN_REQUESTED: "Запрошен возврат",
  RETURNED: "Возвращена",
  CANCELLED: "Отменена",
};

function cell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  const text = safe.replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET(request: Request) {
  await assertAdmin();

  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const days = allowedDays.has(requestedDays) ? requestedDays : 30;
  const from = startOfBishkekPeriod(days);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from } },
    include: { employee: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    [
      "Дата",
      "Чек",
      "Продавец",
      "Оплата",
      "Статус",
      "Скидка, %",
      "Скидка, сом",
      "Товар",
      "Количество",
      "Цена продажи",
      "Себестоимость",
      "Сумма",
      "Прибыль",
    ],
  ];

  for (const sale of sales) {
    for (const item of sale.items) {
      const profit = item.unitPrice.minus(item.unitCost).mul(item.quantity);
      rows.push([
        sale.createdAt.toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" }),
        sale.receiptNumber || sale.id,
        sale.employee?.name || "",
        paymentLabels[sale.paymentMethod] || sale.paymentMethod,
        statusLabels[sale.status] || sale.status,
        sale.discountPercent.toString(),
        sale.discountAmount.toString(),
        item.product.name,
        item.quantity.toString(),
        item.unitPrice.toString(),
        item.unitCost.toString(),
        item.total.toString(),
        profit.toString(),
      ]);
    }
  }

  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-report-${days}-days.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
