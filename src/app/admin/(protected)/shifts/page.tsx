import { CashMovementType, CashShiftStatus, PaymentMethod } from "@prisma/client";
import { CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CashShiftsPage() {
  const shifts = await prisma.cashShift.findMany({
    take: 100,
    orderBy: { openedAt: "desc" },
    include: {
      employee: true,
      sales: {
        where: { status: { in: ["COMPLETED", "RETURN_REQUESTED"] } },
        select: { total: true, payments: true },
      },
      cashMovements: true,
    },
  });

  const rows = shifts.map((shift) => {
    const liveCashSales = shift.sales
      .flatMap((sale) => sale.payments)
      .filter((payment) => payment.method === PaymentMethod.CASH)
      .reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const liveTotalSales = shift.sales.reduce(
      (sum, sale) => sum + sale.total.toNumber(),
      0,
    );
    const isOpen = shift.status === CashShiftStatus.OPEN;
    const cashSales = isOpen
      ? liveCashSales
      : (shift.cashSales?.toNumber() ?? 0);
    const movementAmount = (type: CashMovementType) =>
      shift.cashMovements
        .filter((movement) => movement.type === type)
        .reduce((sum, movement) => sum + movement.amount.toNumber(), 0);
    const cashIn = isOpen
      ? movementAmount(CashMovementType.CASH_IN)
      : (shift.cashIn?.toNumber() ?? 0);
    const cashOut = isOpen
      ? movementAmount(CashMovementType.CASH_OUT)
      : (shift.cashOut?.toNumber() ?? 0);
    const expenses = isOpen
      ? movementAmount(CashMovementType.EXPENSE)
      : (shift.expenses?.toNumber() ?? 0);
    const expectedCash = isOpen
      ? shift.openingCash.toNumber() + cashSales + cashIn - cashOut - expenses
      : (shift.expectedCash?.toNumber() ?? 0);
    return {
      ...shift,
      isOpen,
      cashSales,
      expectedCash,
      totalSales: liveTotalSales,
      difference: shift.cashDifference?.toNumber() ?? null,
      cashIn,
      cashOut,
      expenses,
    };
  });

  const openCount = rows.filter((shift) => shift.isOpen).length;
  const totalDifference = rows
    .filter((shift) => !shift.isOpen)
    .reduce((sum, shift) => sum + (shift.difference ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Кассовые смены</h2>
        <p className="text-muted-foreground">
          Открытие кассы, наличные продажи и контроль расхождений
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <CircleDollarSign className="size-9 text-emerald-700" />
            <div>
              <p className="text-sm text-muted-foreground">Сейчас открыто</p>
              <p className="text-3xl font-bold">{openCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Расхождение по показанным сменам</p>
            <p
              className={`text-3xl font-bold ${
                totalDifference < 0
                  ? "text-rose-700"
                  : totalDifference > 0
                    ? "text-amber-700"
                    : "text-emerald-700"
              }`}
            >
              {formatMoney(totalDifference)}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Последние 100 смен</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Кассир / статус</TableHead>
                <TableHead>Открыта / закрыта</TableHead>
                <TableHead className="text-right">Продажи</TableHead>
                <TableHead className="text-right">Размен</TableHead>
                <TableHead className="text-right">Наличные продажи</TableHead>
                <TableHead className="text-right">Операции</TableHead>
                <TableHead className="text-right">Ожидалось</TableHead>
                <TableHead className="text-right">Фактически</TableHead>
                <TableHead className="text-right">Разница</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <p className="font-medium">{shift.employee.name}</p>
                    <Badge variant={shift.isOpen ? "success" : "secondary"}>
                      {shift.isOpen ? "Открыта" : "Закрыта"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{formatDate(shift.openedAt)}</p>
                    <p className="text-muted-foreground">
                      {shift.closedAt ? formatDate(shift.closedAt) : "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-medium">{shift.sales.length} чек.</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(shift.totalSales)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(shift.openingCash)}</TableCell>
                  <TableCell className="text-right">{formatMoney(shift.cashSales)}</TableCell>
                  <TableCell className="text-right text-xs">
                    <p className="text-emerald-700">+ {formatMoney(shift.cashIn)}</p>
                    <p className="text-rose-700">− {formatMoney(shift.cashOut + shift.expenses)}</p>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(shift.expectedCash)}</TableCell>
                  <TableCell className="text-right">
                    {shift.closingCash ? formatMoney(shift.closingCash) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {shift.difference === null ? (
                      "—"
                    ) : (
                      <span
                        className={
                          shift.difference < 0
                            ? "font-bold text-rose-700"
                            : shift.difference > 0
                              ? "font-bold text-amber-700"
                              : "font-medium text-emerald-700"
                        }
                      >
                        {formatMoney(shift.difference)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!rows.length ? (
            <p className="py-10 text-center text-muted-foreground">Смен пока нет</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
