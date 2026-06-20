import { timingSafeEqual } from "node:crypto";
import {
  buildDailyTelegramReport,
  buildLowStockTelegramReport,
  buildOpenShiftsTelegramReport,
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
  "/stock — товары с низким остатком",
  "/shifts — открытые кассовые смены",
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

  const command = message.text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
  let response = help;
  if (command === "/report") response = await buildDailyTelegramReport();
  if (command === "/stock") response = await buildLowStockTelegramReport();
  if (command === "/shifts") response = await buildOpenShiftsTelegramReport();
  await sendTelegramMessage(response, { chatId });
  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({ ok: true, service: "SSS+ Telegram bot" });
}
