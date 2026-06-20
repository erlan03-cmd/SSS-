import { CircleDollarSign, Lightbulb, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { openShiftAction } from "@/app/cash/actions";
import { CashRegister } from "@/components/cash-register";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOpenShiftSummary } from "@/lib/cash-shift";
import { getCashProducts } from "@/lib/data";
import { requireEmployee } from "@/lib/employee-auth";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const employee = await requireEmployee();
  const shift = await getOpenShiftSummary(employee.id);

  if (!shift) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CircleDollarSign className="size-7" />
            </div>
            <CardTitle className="text-2xl">Открытие кассовой смены</CardTitle>
            <p className="text-sm text-muted-foreground">
              {employee.name}, укажите наличный размен, который уже лежит в кассе.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={openShiftAction} className="space-y-4">
              <div>
                <Label htmlFor="openingCash">Размен в кассе, сом</Label>
                <Input
                  id="openingCash"
                  name="openingCash"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                  autoFocus
                  className="mt-2 h-14 text-lg"
                />
              </div>
              <Button className="h-14 w-full text-base">
                <CircleDollarSign /> Открыть смену
              </Button>
            </form>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/cash/logout">
                <LogOut /> Выйти из аккаунта
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [products, heldReceipts] = await Promise.all([
    getCashProducts(),
    prisma.heldReceipt.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="min-h-screen px-4 py-5 md:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Lightbulb className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-primary">Электрика и освещение</p>
              <h1 className="text-2xl font-semibold md:text-3xl">Быстрая касса</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
            <ShieldCheck className="size-4 text-primary" /> {employee.name}
          </div>
        </header>
        <CashRegister
          products={products}
          employee={{ name: employee.name, maxDiscountPercent: toNumber(employee.maxDiscountPercent) }}
          heldReceipts={heldReceipts.map((receipt) => ({
            id: receipt.id,
            name: receipt.name,
            items: receipt.items as Array<{ productId: string; quantity: number }>,
            discountPercent: toNumber(receipt.discountPercent),
            paymentMethod: receipt.paymentMethod,
            createdAt: receipt.createdAt.toISOString(),
          }))}
          shift={shift}
        />
      </div>
    </main>
  );
}
