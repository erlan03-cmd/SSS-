import { timingSafeEqual } from "node:crypto";
import {
  buildCashiersTelegramReport,
  buildDailyTelegramReport,
  buildLastSalesTelegramReport,
  buildLowStockTelegramReport,
  buildOpenShiftsTelegramReport,
  buildOrdersTelegramReport,
  buildPendingReturnsTelegramReport,
  buildProductSearchTelegramReport,
  buildTopProductsTelegramReport,
  buildTodayProfitTelegramReport,
  buildWeeklyTelegramReport,
  sendTelegramMessage,
  telegramChatId,
  telegramWebhookSecret,
  type TelegramUpdate,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

function secretsMatch(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

const help = [
  "🤖 <b>SSS+ помощник</b>",
  "",
  "/report — отчёт за сегодня",
  "/last — последние продажи",
  "/top — топ товаров за сегодня",
  "/profit — прибыль за сегодня",
  "/week — финансовые итоги за 7 дней",
  "/cashiers — продажи по кассирам",
  "/stock — товары с низким остатком",
  "/shifts — открытые кассовые смены",
  "/product запрос — найти товар",
  "/returns — возвраты на проверке",
  "/orders — товары к заказу",
  "/help — список команд",
].join("\n");

export async function POST(request: Request) {
  const expectedSecret = telegramWebhookSecret();
  const receivedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );
  if (
    !expectedSecret ||
    !receivedSecret ||
    !secretsMatch(receivedSecret, expectedSecret)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  if (!message?.text) return Response.json({ ok: true });

  const chatId = String(message.chat.id);
  if (!telegramChatId() || chatId !== telegramChatId()) {
    return Response.json({ ok: true });
  }

  const text = message.text.trim();
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  const query = text.slice(text.indexOf(" ") + 1).trim();
  let response = help;
  if (command === "/report") response = await buildDailyTelegramReport();
  if (command === "/last") response = await buildLastSalesTelegramReport();
  if (command === "/top") response = await buildTopProductsTelegramReport();
  if (command === "/profit") response = await buildTodayProfitTelegramReport();
  if (command === "/week") response = await buildWeeklyTelegramReport();
  if (command === "/cashiers") response = await buildCashiersTelegramReport();
  if (command === "/stock") response = await buildLowStockTelegramReport();
  if (command === "/shifts") response = await buildOpenShiftsTelegramReport();
  if (command === "/returns") response = await buildPendingReturnsTelegramReport();
  if (command === "/orders") response = await buildOrdersTelegramReport();
  if (command === "/product") {
    response = await buildProductSearchTelegramReport(
      text.includes(" ") ? query : "",
    );
  }
  await sendTelegramMessage(response, { chatId, menu: true });
  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({ ok: true, service: "SSS+ Telegram bot" });
}
