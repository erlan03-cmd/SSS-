import {
  CashMovementType,
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
  cashIn: number;
  cashOut: number;
  expenses: number;
};

export async function getOpenShiftSummary(
  employeeId: string,
): Promise<CashShiftSummary | null> {
  const shift = await prisma.cashShift.findFirst({
    where: { employeeId, status: CashShiftStatus.OPEN },
    orderBy: { openedAt: "desc" },
  });
  if (!shift) return null;

  const [totals, sales, movements] = await Promise.all([
    prisma.salePayment.groupBy({
      by: ["method"],
      where: {
        sale: { shiftId: shift.id, status: { in: countedSaleStatuses } },
      },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { shiftId: shift.id, status: { in: countedSaleStatuses } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.cashMovement.groupBy({
      by: ["type"],
      where: { shiftId: shift.id },
      _sum: { amount: true },
    }),
  ]);
  const amount = (method: PaymentMethod) =>
    totals.find((row) => row.method === method)?._sum.amount?.toNumber() ?? 0;
  const movementAmount = (type: CashMovementType) =>
    movements.find((row) => row.type === type)?._sum.amount?.toNumber() ?? 0;
  const cashSales = amount(PaymentMethod.CASH);
  const cashIn = movementAmount(CashMovementType.CASH_IN);
  const cashOut = movementAmount(CashMovementType.CASH_OUT);
  const expenses = movementAmount(CashMovementType.EXPENSE);

  return {
    id: shift.id,
    openedAt: shift.openedAt.toISOString(),
    openingCash: shift.openingCash.toNumber(),
    cashSales,
    cardSales: amount(PaymentMethod.CARD),
    qrSales: amount(PaymentMethod.QR),
    transferSales: amount(PaymentMethod.TRANSFER),
    totalSales: sales._sum.total?.toNumber() ?? 0,
    saleCount: sales._count._all,
    expectedCash:
      shift.openingCash.toNumber() + cashSales + cashIn - cashOut - expenses,
    cashIn,
    cashOut,
    expenses,
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
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      },
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

      const [cashAggregate, totalAggregate, saleCount, movementTotals] =
        await Promise.all([
        tx.salePayment.aggregate({
          where: {
            method: PaymentMethod.CASH,
            sale: {
              shiftId: shift.id,
              status: { in: countedSaleStatuses },
            },
          },
          _sum: { amount: true },
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
        tx.cashMovement.groupBy({
          by: ["type"],
          where: { shiftId: shift.id },
          _sum: { amount: true },
        }),
      ]);
      const cashSales = cashAggregate._sum.amount ?? new Prisma.Decimal(0);
      const totalSales = totalAggregate._sum.total ?? new Prisma.Decimal(0);
      const movementAmount = (type: CashMovementType) =>
        movementTotals.find((row) => row.type === type)?._sum.amount ??
        new Prisma.Decimal(0);
      const cashIn = movementAmount(CashMovementType.CASH_IN);
      const cashOut = movementAmount(CashMovementType.CASH_OUT);
      const expenses = movementAmount(CashMovementType.EXPENSE);
      const expectedCash = shift.openingCash
        .plus(cashSales)
        .plus(cashIn)
        .minus(cashOut)
        .minus(expenses);
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
          cashIn,
          cashOut,
          expenses,
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
            cashIn: cashIn.toString(),
            cashOut: cashOut.toString(),
            expenses: expenses.toString(),
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
        cashIn,
        cashOut,
        expenses,
        closedAt,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}

export async function recordCashMovement(input: {
  employeeId: string;
  employeeName: string;
  type: CashMovementType;
  amount: Prisma.Decimal;
  note: string;
}) {
  if (!input.amount.isPositive()) throw new Error("Сумма должна быть больше нуля");
  if (input.note.trim().length < 2) throw new Error("Укажите причину операции");

  return prisma.$transaction(
    async (tx) => {
      const shift = await tx.cashShift.findFirst({
        where: { employeeId: input.employeeId, status: CashShiftStatus.OPEN },
        orderBy: { openedAt: "desc" },
      });
      if (!shift) throw new Error("Открытая кассовая смена не найдена");

      if (input.type !== CashMovementType.CASH_IN) {
        const [cashPayments, movements] = await Promise.all([
          tx.salePayment.aggregate({
            where: {
              method: PaymentMethod.CASH,
              sale: {
                shiftId: shift.id,
                status: { in: countedSaleStatuses },
              },
            },
            _sum: { amount: true },
          }),
          tx.cashMovement.groupBy({
            by: ["type"],
            where: { shiftId: shift.id },
            _sum: { amount: true },
          }),
        ]);
        const movementAmount = (type: CashMovementType) =>
          movements.find((row) => row.type === type)?._sum.amount ??
          new Prisma.Decimal(0);
        const available = shift.openingCash
          .plus(cashPayments._sum.amount ?? 0)
          .plus(movementAmount(CashMovementType.CASH_IN))
          .minus(movementAmount(CashMovementType.CASH_OUT))
          .minus(movementAmount(CashMovementType.EXPENSE));
        if (input.amount.greaterThan(available)) {
          throw new Error(
            `В кассе недостаточно наличных. Доступно: ${available.toFixed(2)} сом`,
          );
        }
      }

      const movement = await tx.cashMovement.create({
        data: {
          type: input.type,
          amount: input.amount,
          note: input.note.trim(),
          shiftId: shift.id,
          employeeId: input.employeeId,
        },
      });
      await tx.auditLog.create({
        data: {
          action: `CASH_${input.type}`,
          entityType: "CashMovement",
          entityId: movement.id,
          actorName: input.employeeName,
          employeeId: input.employeeId,
          details: {
            shiftId: shift.id,
            amount: input.amount.toString(),
            note: input.note.trim(),
          },
        },
      });
      return movement;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}
