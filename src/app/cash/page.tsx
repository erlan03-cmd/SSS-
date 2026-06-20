import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CashRegister } from "@/components/cash-register";
import { Button } from "@/components/ui/button";
import { getCashProducts, getRecentOperations } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const [products, history] = await Promise.all([
    getCashProducts(),
    getRecentOperations(10),
  ]);

  return (
    <main className="min-h-screen px-4 py-5 md:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">SSS+ склад</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Касса</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">
              <ShieldCheck />
              Админ
            </Link>
          </Button>
        </header>
        <CashRegister products={products} history={history} />
      </div>
    </main>
  );
}
