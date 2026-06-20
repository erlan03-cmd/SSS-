import { Prisma } from "@prisma/client";
import { Lightbulb, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { CashRegister } from "@/components/cash-register";
import { getOpenShiftSummary, openCashShift } from "@/lib/cash-shift";
import { getCashProducts } from "@/lib/data";
import { requireEmployee } from "@/lib/employee-auth";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { maybeSendDailyTelegramReport } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const employee = await requireEmployee();
  await maybeSendDailyTelegramReport();
  const shift = await getOpenShiftSummary(employee.id);

  if (!shift) {
    try {
      await openCashShift({
        employeeId: employee.id,
        employeeName: employee.name,
        openingCash: new Prisma.Decimal(0),
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("уже открыта")) {
        throw error;
      }
    }
    redirect("/cash");
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
