import { PaymentMethod, Prisma, SaleStatus } from "@prisma/client";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const BISHKEK_OFFSET_MS = 6 * 60 * 60 * 1000;
const countedStatuses = [SaleStatus.COMPLETED, SaleStatus.RETURN_REQUESTED];

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { first_name?: string; username?: string };
  };
};

type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export function escapeTelegramHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function telegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim();
}

export function telegramChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim();
}

export function telegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
}

export function isTelegramConfigured() {
  return Boolean(telegramToken() && telegramChatId());
}

async function telegramRequest<T>(method: string, payload: object) {
  const token = telegramToken();
  if (!token) throw new Error("Telegram bot is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const data = (await response.json()) as TelegramApiResponse<T>;
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API error ${response.status}`);
  }
  return data.result;
}

export async function sendTelegramMessage(
  text: string,
  options: { chatId?: string; silent?: boolean; menu?: boolean } = {},
) {
  const chatId = options.chatId || telegramChatId();
  if (!telegramToken() || !chatId) return false;
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    disable_notification: options.silent ?? false,
    ...(options.menu
      ? {
          reply_markup: {
            keyboard: [
              [{ text: "/report" }, { text: "/last" }, { text: "/top" }],
              [{ text: "/profit" }, { text: "/week" }, { text: "/cashiers" }],
              [{ text: "/stock" }, { text: "/shifts" }, { text: "/help" }],
              [{ text: "/returns" }, { text: "/orders" }],
            ],
            resize_keyboard: true,
            is_persistent: true,
          },
        }
      : {}),
  });
  return true;
}

async function safelySend(text: string, options?: { silent?: boolean }) {
  try {
    return await sendTelegramMessage(text, options);
  } catch (error) {
    console.error(
      "Telegram notification failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return false;
  }
}

function bishkekDay(date = new Date()) {
  const shifted = new Date(date.getTime() + BISHKEK_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return {
    key: `${year}-${month}-${day}`,
    hour: shifted.getUTCHours(),
    start: new Date(Date.UTC(year, shifted.getUTCMonth(), shifted.getUTCDate()) - BISHKEK_OFFSET_MS),
  };
}

export async function buildDailyTelegramReport() {
  const day = bishkekDay();
  const [sales, payments, lowStock, pendingReturns, openShifts] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: day.start }, status: { in: countedStatuses } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: day.start }, status: { in: countedStatuses } },
        _sum: { total: true },
      }),
      prisma.product.count({
        where: { active: true, stock: { lte: prisma.product.fields.minStock } },
      }),
      prisma.returnRequest.count({ where: { status: "PENDING" } }),
      prisma.cashShift.count({ where: { status: "OPEN" } }),
    ]);
  const byPayment = (method: PaymentMethod) =>
    payments.find((item) => item.paymentMethod === method)?._sum.total ??
    new Prisma.Decimal(0);

  return [
    `📊 <b>Отчёт SSS+ за ${day.key}</b>`,
    "",
    `Чеков: <b>${sales._count._all}</b>`,
    `Выручка: <b>${escapeTelegramHtml(formatMoney(sales._sum.total ?? 0))}</b>`,
    `💵 Наличные: ${escapeTelegramHtml(formatMoney(byPayment(PaymentMethod.CASH)))}`,
    `💳 Карта: ${escapeTelegramHtml(formatMoney(byPayment(PaymentMethod.CARD)))}`,
    `📱 QR: ${escapeTelegramHtml(formatMoney(byPayment(PaymentMethod.QR)))}`,
    `🏦 Перевод: ${escapeTelegramHtml(formatMoney(byPayment(PaymentMethod.TRANSFER)))}`,
    "",
    `⚠️ Низкий остаток: <b>${lowStock}</b>`,
    `↩️ Возвраты на проверке: <b>${pendingReturns}</b>`,
    `🟢 Открытые смены: <b>${openShifts}</b>`,
  ].join("\n");
}

export async function buildLowStockTelegramReport() {
  const products = await prisma.product.findMany({
    where: { active: true, stock: { lte: prisma.product.fields.minStock } },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    take: 30,
  });
  if (!products.length) return "✅ <b>Низких остатков нет</b>";
  return [
    `⚠️ <b>Низкий остаток — ${products.length} поз.</b>`,
    "",
    ...products.map(
      (product) =>
        `• ${escapeTelegramHtml(product.name)} — <b>${escapeTelegramHtml(formatQuantity(product.stock, product.unit))}</b> (мин. ${escapeTelegramHtml(formatQuantity(product.minStock, product.unit))})`,
    ),
  ].join("\n");
}

export async function buildOpenShiftsTelegramReport() {
  const shifts = await prisma.cashShift.findMany({
    where: { status: "OPEN" },
    include: {
      employee: true,
      sales: {
        where: { status: { in: countedStatuses } },
        select: { total: true, paymentMethod: true },
      },
    },
    orderBy: { openedAt: "asc" },
  });
  if (!shifts.length) return "🔒 <b>Все кассовые смены закрыты</b>";
  return [
    `🟢 <b>Открытые смены — ${shifts.length}</b>`,
    "",
    ...shifts.map((shift) => {
      const cashSales = shift.sales
        .filter((sale) => sale.paymentMethod === PaymentMethod.CASH)
        .reduce((sum, sale) => sum.plus(sale.total), new Prisma.Decimal(0));
      return `• ${escapeTelegramHtml(shift.employee.name)}: ${shift.sales.length} чек., в кассе ожидается <b>${escapeTelegramHtml(formatMoney(shift.openingCash.plus(cashSales)))}</b>`;
    }),
  ].join("\n");
}

export async function buildLastSalesTelegramReport() {
  const sales = await prisma.sale.findMany({
    where: { status: { in: countedStatuses } },
    take: 7,
    orderBy: { createdAt: "desc" },
    include: {
      employee: true,
      items: { include: { product: true } },
    },
  });
  if (!sales.length) return "🧾 <b>Продаж пока нет</b>";
  return [
    "🧾 <b>Последние продажи</b>",
    "",
    ...sales.map((sale) => {
      const itemNames = sale.items
        .slice(0, 3)
        .map((item) => escapeTelegramHtml(item.product.name))
        .join(", ");
      const extra = sale.items.length > 3 ? ` + ещё ${sale.items.length - 3}` : "";
      return [
        `<b>${escapeTelegramHtml(sale.receiptNumber || "Продажа")}</b> · ${escapeTelegramHtml(formatMoney(sale.total))}`,
        `${escapeTelegramHtml(formatDate(sale.createdAt))} · ${escapeTelegramHtml(sale.employee?.name || "Без кассира")}`,
        `${itemNames}${extra}`,
      ].join("\n");
    }),
  ].join("\n\n");
}

export async function buildTopProductsTelegramReport() {
  const day = bishkekDay();
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { createdAt: { gte: day.start }, status: { in: countedStatuses } },
    },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { total: "desc" } },
    take: 10,
  });
  if (!grouped.length) return "🏆 <b>Сегодня продаж пока нет</b>";
  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((row) => row.productId) } },
    select: { id: true, name: true, unit: true },
  });
  const names = new Map(products.map((product) => [product.id, product]));
  return [
    `🏆 <b>Топ товаров за ${day.key}</b>`,
    "",
    ...grouped.map((row, index) => {
      const product = names.get(row.productId);
      return `${index + 1}. ${escapeTelegramHtml(product?.name || "Товар удалён")} — <b>${escapeTelegramHtml(formatMoney(row._sum.total ?? 0))}</b> (${escapeTelegramHtml(formatQuantity(row._sum.quantity ?? 0, product?.unit))})`;
    }),
  ].join("\n");
}

export async function buildProductSearchTelegramReport(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [
      "🔎 <b>Поиск товара</b>",
      "Введите команду и название, артикул или штрих‑код.",
      "Пример: <code>/product лампа</code>",
    ].join("\n");
  }
  const products = await prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: normalized, mode: "insensitive" } },
        { sku: { contains: normalized, mode: "insensitive" } },
        { barcode: normalized },
        { brand: { contains: normalized, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
  });
  if (!products.length) {
    return `🔎 По запросу <b>${escapeTelegramHtml(normalized)}</b> ничего не найдено`;
  }
  return [
    `🔎 <b>Найдено: ${products.length}</b>`,
    "",
    ...products.map((product) => {
      const code = product.barcode || product.sku || "без кода";
      const location = [product.warehouse, product.rack, product.shelf]
        .filter(Boolean)
        .join(" · ");
      return [
        `<b>${escapeTelegramHtml(product.name)}</b>`,
        `${escapeTelegramHtml(code)} · ${escapeTelegramHtml(formatMoney(product.price))}`,
        `Остаток: <b>${escapeTelegramHtml(formatQuantity(product.stock, product.unit))}</b>${location ? ` · ${escapeTelegramHtml(location)}` : ""}`,
      ].join("\n");
    }),
  ].join("\n\n");
}

async function buildFinanceTelegramReport(days: number, title: string) {
  const start = new Date(
    bishkekDay().start.getTime() - Math.max(days - 1, 0) * 24 * 60 * 60 * 1000,
  );
  const [sales, items] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: start }, status: { in: countedStatuses } },
      _sum: { total: true, discountAmount: true },
      _count: { _all: true },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: start }, status: { in: countedStatuses } },
      },
      select: { quantity: true, unitPrice: true, unitCost: true },
    }),
  ]);
  const cost = items.reduce(
    (sum, item) => sum.plus(item.unitCost.mul(item.quantity)),
    new Prisma.Decimal(0),
  );
  const revenue = sales._sum.total ?? new Prisma.Decimal(0);
  const profit = revenue.minus(cost);
  const margin = revenue.greaterThan(0)
    ? profit.mul(100).div(revenue).toDecimalPlaces(1)
    : new Prisma.Decimal(0);
  const average = sales._count._all
    ? revenue.div(sales._count._all).toDecimalPlaces(2)
    : new Prisma.Decimal(0);

  return [
    `💰 <b>${escapeTelegramHtml(title)}</b>`,
    "",
    `Чеков: <b>${sales._count._all}</b>`,
    `Выручка: <b>${escapeTelegramHtml(formatMoney(revenue))}</b>`,
    `Себестоимость: ${escapeTelegramHtml(formatMoney(cost))}`,
    `Валовая прибыль: <b>${escapeTelegramHtml(formatMoney(profit))}</b>`,
    `Маржа: <b>${margin.toString()}%</b>`,
    `Средний чек: ${escapeTelegramHtml(formatMoney(average))}`,
    `Скидки: ${escapeTelegramHtml(formatMoney(sales._sum.discountAmount ?? 0))}`,
  ].join("\n");
}

export function buildTodayProfitTelegramReport() {
  return buildFinanceTelegramReport(1, "Прибыль за сегодня");
}

export function buildWeeklyTelegramReport() {
  return buildFinanceTelegramReport(7, "Итоги за 7 дней");
}

export async function buildCashiersTelegramReport() {
  const day = bishkekDay();
  const grouped = await prisma.sale.groupBy({
    by: ["employeeId"],
    where: {
      createdAt: { gte: day.start },
      status: { in: countedStatuses },
      employeeId: { not: null },
    },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: "desc" } },
  });
  if (!grouped.length) return "👥 <b>Сегодня продаж по кассирам ещё нет</b>";
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: grouped.flatMap((row) => (row.employeeId ? [row.employeeId] : [])) },
    },
    select: { id: true, name: true },
  });
  const names = new Map(employees.map((employee) => [employee.id, employee.name]));
  return [
    "👥 <b>Кассиры сегодня</b>",
    "",
    ...grouped.map(
      (row, index) =>
        `${index + 1}. ${escapeTelegramHtml((row.employeeId && names.get(row.employeeId)) || "Сотрудник удалён")} — <b>${escapeTelegramHtml(formatMoney(row._sum.total ?? 0))}</b>, ${row._count._all} чек.`,
    ),
  ].join("\n");
}

export async function buildPendingReturnsTelegramReport() {
  const requests = await prisma.returnRequest.findMany({
    where: { status: "PENDING" },
    include: { sale: true, employee: true },
    orderBy: { createdAt: "asc" },
    take: 15,
  });
  if (!requests.length) return "✅ <b>Возвратов на проверке нет</b>";
  return [
    `↩️ <b>Возвраты на проверке — ${requests.length}</b>`,
    "",
    ...requests.map((request) => {
      const reason =
        request.reason.length > 80
          ? `${request.reason.slice(0, 77)}…`
          : request.reason;
      return [
        `<b>${escapeTelegramHtml(request.sale.receiptNumber || request.sale.id)}</b> · ${escapeTelegramHtml(formatMoney(request.sale.total))}`,
        `${escapeTelegramHtml(request.employee.name)} · ${escapeTelegramHtml(formatDate(request.createdAt))}`,
        `Причина: ${escapeTelegramHtml(reason)}`,
      ].join("\n");
    }),
  ].join("\n\n");
}

export async function buildOrdersTelegramReport() {
  const products = await prisma.product.findMany({
    where: { active: true, stock: { lte: prisma.product.fields.minStock } },
    include: { supplier: true },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    take: 25,
  });
  if (!products.length) return "✅ <b>Список закупки пуст</b>";
  return [
    `🛒 <b>Товары к заказу — ${products.length}</b>`,
    "",
    ...products.map((product) => {
      const recommended = product.recommendedOrderQty.greaterThan(0)
        ? product.recommendedOrderQty
        : Prisma.Decimal.max(product.minStock.mul(2).minus(product.stock), 0);
      return `• ${escapeTelegramHtml(product.name)} — сейчас <b>${escapeTelegramHtml(formatQuantity(product.stock, product.unit))}</b>, заказать ${escapeTelegramHtml(formatQuantity(recommended, product.unit))}${product.supplier ? ` · ${escapeTelegramHtml(product.supplier.name)}` : ""}`;
    }),
  ].join("\n");
}

export async function notifyLowStockAfterSale(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      receiptNumber: true,
      items: { include: { product: true } },
    },
  });
  const low = sale?.items.filter(
    (item) => item.product.active && item.product.stock.lte(item.product.minStock),
  );
  if (!low?.length) return false;
  return safelySend(
    [
      `⚠️ <b>После продажи низкий остаток</b>`,
      sale?.receiptNumber ? `Чек: ${escapeTelegramHtml(sale.receiptNumber)}` : "",
      "",
      ...low.map(
        (item) =>
          `• ${escapeTelegramHtml(item.product.name)} — <b>${escapeTelegramHtml(formatQuantity(item.product.stock, item.product.unit))}</b>`,
      ),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function notifyReturnRequested(input: {
  receiptNumber: string;
  employeeName: string;
  reason: string;
  total: Prisma.Decimal;
}) {
  return safelySend(
    [
      "↩️ <b>Новый запрос на возврат</b>",
      `Чек: ${escapeTelegramHtml(input.receiptNumber)}`,
      `Сумма: <b>${escapeTelegramHtml(formatMoney(input.total))}</b>`,
      `Сотрудник: ${escapeTelegramHtml(input.employeeName)}`,
      `Причина: ${escapeTelegramHtml(input.reason)}`,
    ].join("\n"),
  );
}

export async function notifyReturnDecision(input: {
  receiptNumber: string;
  approved: boolean;
  note?: string;
}) {
  return safelySend(
    [
      input.approved ? "✅ <b>Возврат одобрен</b>" : "❌ <b>Возврат отклонён</b>",
      `Чек: ${escapeTelegramHtml(input.receiptNumber)}`,
      input.note ? `Комментарий: ${escapeTelegramHtml(input.note)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { silent: true },
  );
}

export async function notifyShiftClosed(input: {
  employeeName: string;
  expectedCash: Prisma.Decimal;
  closingCash: Prisma.Decimal;
  difference: Prisma.Decimal;
  totalSales: Prisma.Decimal;
  saleCount: number;
}) {
  const hasDifference = !input.difference.equals(0);
  return safelySend(
    [
      hasDifference ? "🚨 <b>Смена закрыта с расхождением</b>" : "🔒 <b>Смена закрыта</b>",
      `Кассир: ${escapeTelegramHtml(input.employeeName)}`,
      `Продаж: ${input.saleCount} на ${escapeTelegramHtml(formatMoney(input.totalSales))}`,
      `Ожидалось наличных: ${escapeTelegramHtml(formatMoney(input.expectedCash))}`,
      `Фактически: ${escapeTelegramHtml(formatMoney(input.closingCash))}`,
      `Разница: <b>${escapeTelegramHtml(formatMoney(input.difference))}</b>`,
    ].join("\n"),
    { silent: !hasDifference },
  );
}

let dailyHandled = "";

export async function maybeSendDailyTelegramReport() {
  if (!isTelegramConfigured()) return;
  const day = bishkekDay();
  if (day.hour < 20 || dailyHandled === day.key) return;

  const alreadySent = await prisma.auditLog.findFirst({
    where: {
      action: "TELEGRAM_DAILY_REPORT_SENT",
      entityType: "TelegramReport",
      entityId: day.key,
    },
    select: { id: true },
  });
  if (alreadySent) {
    dailyHandled = day.key;
    return;
  }

  const sent = await safelySend(await buildDailyTelegramReport(), { silent: true });
  if (!sent) return;
  await prisma.auditLog.create({
    data: {
      action: "TELEGRAM_DAILY_REPORT_SENT",
      entityType: "TelegramReport",
      entityId: day.key,
      actorName: "Система",
    },
  });
  dailyHandled = day.key;
}

export type { TelegramUpdate };
