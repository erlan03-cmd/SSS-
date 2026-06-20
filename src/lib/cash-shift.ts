import {
  CashShiftStatus,
  PaymentMethod,
  Prisma,
  SaleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const countedSaleStatuses = [
  SaleStatus.COMPLETED,
  SaleStatus.RETURN_REQUESTED,
];

export type CashShiftSummary = {
  id: string;
  openedAt: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  qrSales: number;
  transferSales: number;
  totalSales: number;
  saleCount: number;
  expectedCash: number;
};

export async function getOpenShiftSummary(
  employeeId: string,
): Promise<CashShiftSummary | null> {
  const shift = await prisma.cashShift.findFirst({
    where: { employeeId, status: CashShiftStatus.OPEN },
    orderBy: { openedAt: "desc" },
  });
  if (!shift) return null;

  const totals = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { shiftId: shift.id, status: { in: countedSaleStatuses } },
    _sum: { total: true },
    _count: { _all: true },
  });
  const amount = (method: PaymentMethod) =>
    totals.find((row) => row.paymentMethod === method)?._sum.total?.toNumber() ?? 0;
  const cashSales = amount(PaymentMethod.CASH);
  const totalSales = totals.reduce(
    (sum, row) => sum + (row._sum.total?.toNumber() ?? 0),
    0,
  );

  return {
    id: shift.id,
    openedAt: shift.openedAt.toISOString(),
    openingCash: shift.openingCash.toNumber(),
    cashSales,
    cardSales: amount(PaymentMethod.CARD),
    qrSales: amount(PaymentMethod.QR),
    transferSales: amount(PaymentMethod.TRANSFER),
    totalSales,
    saleCount: totals.reduce((sum, row) => sum + row._count._all, 0),
    expectedCash: shift.openingCash.toNumber() + cashSales,
  };
}

export async function openCashShift(input: {
  employeeId: string;
  employeeName: string;
  openingCash: Prisma.Decimal;
}) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const employee = await tx.employee.findUnique({
          where: { id: input.employeeId },
        });
        if (!employee?.active || employee.deletedAt) {
          throw new Error("Аккаунт продавца отключён");
        }
        const existing = await tx.cashShift.findFirst({
          where: {
            employeeId: employee.id,
            status: CashShiftStatus.OPEN,
          },
        });
        if (existing) throw new Error("Кассовая смена уже открыта");

        const shift = await tx.cashShift.create({
          data: {
            employeeId: employee.id,
            openingCash: input.openingCash,
          },
        });
        await tx.auditLog.create({
          data: {
            action: "CASH_SHIFT_OPENED",
            entityType: "CashShift",
            entityId: shift.id,
            actorName: input.employeeName,
            employeeId: employee.id,
            details: { openingCash: input.openingCash.toString() },
          },
        });
        return shift;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Кассовая смена уже открыта");
    }
    throw error;
  }
}

export async function closeCashShift(input: {
  employeeId: string;
  employeeName: string;
  closingCash: Prisma.Decimal;
  note?: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const shift = await tx.cashShift.findFirst({
        where: {
          employeeId: input.employeeId,
          status: CashShiftStatus.OPEN,
        },
        orderBy: { openedAt: "desc" },
      });
      if (!shift) throw new Error("Открытая кассовая смена не найдена");

      const [cashAggregate, totalAggregate, saleCount] = await Promise.all([
        tx.sale.aggregate({
          where: {
            shiftId: shift.id,
            paymentMethod: PaymentMethod.CASH,
            status: { in: countedSaleStatuses },
          },
          _sum: { total: true },
        }),
        tx.sale.aggregate({
          where: {
            shiftId: shift.id,
            status: { in: countedSaleStatuses },
          },
          _sum: { total: true },
        }),
        tx.sale.count({
          where: {
            shiftId: shift.id,
            status: { in: countedSaleStatuses },
          },
        }),
      ]);
      const cashSales = cashAggregate._sum.total ?? new Prisma.Decimal(0);
      const totalSales = totalAggregate._sum.total ?? new Prisma.Decimal(0);
      const expectedCash = shift.openingCash.plus(cashSales);
      const cashDifference = input.closingCash.minus(expectedCash);
      const closedAt = new Date();

      const updated = await tx.cashShift.updateMany({
        where: { id: shift.id, status: CashShiftStatus.OPEN },
        data: {
          status: CashShiftStatus.CLOSED,
          closingCash: input.closingCash,
          cashSales,
          expectedCash,
          cashDifference,
          note: input.note || null,
          closedAt,
        },
      });
      if (updated.count !== 1) throw new Error("Смена уже была закрыта");

      await tx.auditLog.create({
        data: {
          action: "CASH_SHIFT_CLOSED",
          entityType: "CashShift",
          entityId: shift.id,
          actorName: input.employeeName,
          employeeId: input.employeeId,
          details: {
            openingCash: shift.openingCash.toString(),
            cashSales: cashSales.toString(),
            totalSales: totalSales.toString(),
            saleCount,
            expectedCash: expectedCash.toString(),
            closingCash: input.closingCash.toString(),
            cashDifference: cashDifference.toString(),
            note: input.note || null,
          },
        },
      });

      return {
        id: shift.id,
        openingCash: shift.openingCash,
        cashSales,
        totalSales,
        saleCount,
        expectedCash,
        closingCash: input.closingCash,
        cashDifference,
        closedAt,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
