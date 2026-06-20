import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { BarcodeLabelManager } from "@/components/barcode-label-manager";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductLabelsPage() {
  const products = await prisma.product.findMany({
    where: { active: true, barcode: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, barcode: true, sku: true, price: true },
  });

  return (
    <div className="space-y-5">
      <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold">
            <Printer /> Печать ценников
          </h2>
          <p className="text-muted-foreground">
            Выберите товары и количество наклеек для печати
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/products">
            <ArrowLeft /> К товарам
          </Link>
        </Button>
      </div>
      <BarcodeLabelManager
        products={products.map((product) => ({
          ...product,
          barcode: product.barcode!,
          price: product.price.toNumber(),
        }))}
      />
    </div>
  );
}
