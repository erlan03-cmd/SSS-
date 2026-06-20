import type { Prisma } from "@prisma/client";

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bishkek",
});

export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

export function formatMoney(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  return `${moneyFormatter.format(toNumber(value))} сом`;
}

export function formatQuantity(
  value: Prisma.Decimal | number | string | null | undefined,
  unit?: string,
) {
  const quantity = numberFormatter.format(toNumber(value));
  return unit ? `${quantity} ${unit}` : quantity;
}

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}
