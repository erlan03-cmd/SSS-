import {
  BarChart3,
  Boxes,
  Clock3,
  PackageX,
  RotateCcw,
  Tags,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { ReportActions } from "@/components/report-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReportData } from "@/lib/data";
import { formatMoney, formatQuantity, toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const periodLabels: Record<number, string> = {
  1: "Сегодня",
  7: "7 дней",
  30: "30 дней",
};

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  timeZone: "Asia/Bishkek",
});

type PageProps = {
  searchParams: Promise<{ days?: string }>;
};

type SupplierMetric = {
  name: string;
  productCount: number;
  lowStockCount: number;
  stockCost: number;
  stockRetail: number;
  revenue: number;
  profit: number;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedDays = Number(params.days);
  const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 30;
  const { from, sales, products, movements } = await getReportData(days);

  const completed = sales.filter((sale) => sale.status === "COMPLETED");
  const returned = sales.filter((sale) => sale.status === "RETURNED");
  const pendingReturns = sales.filter(
    (sale) => sale.status === "RETURN_REQUESTED",
  );
  const revenue = completed.reduce(
    (sum, sale) => sum + toNumber(sale.total),
    0,
  );
  const profit = completed
    .flatMap((sale) => sale.items)
    .reduce(
      (sum, item) =>
        sum +
        (toNumber(item.unitPrice) - toNumber(item.unitCost)) *
          toNumber(item.quantity),
      0,
    );
  const discountTotal = completed.reduce(
    (sum, sale) => sum + toNumber(sale.discountAmount),
    0,
  );

  const sellerMap = new Map<
    string,
    { count: number; total: number; profit: number }
  >();
  const productMap = new Map<
    string,
    {
      name: string;
      unit: string;
      quantity: number;
      total: number;
      profit: number;
    }
  >();
  const productById = new Map(products.map((product) => [product.id, product]));

  const supplierMap = new Map<string, SupplierMetric>();
  function supplierMetric(name: string) {
    const current = supplierMap.get(name);
    if (current) return current;
    const created: SupplierMetric = {
      name,
      productCount: 0,
      lowStockCount: 0,
      stockCost: 0,
      stockRetail: 0,
      revenue: 0,
      profit: 0,
    };
    supplierMap.set(name, created);
    return created;
  }

  for (const product of products.filter((item) => item.active)) {
    const metric = supplierMetric(product.supplier?.name || "Без поставщика");
    metric.productCount += 1;
    metric.stockCost += toNumber(product.stock) * toNumber(product.cost);
    metric.stockRetail += toNumber(product.stock) * toNumber(product.price);
    if (product.stock.lte(product.minStock)) metric.lowStockCount += 1;
  }

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    revenue: 0,
  }));
  for (const sale of completed) {
    const seller = sale.employee?.name || "Без продавца";
    const sellerData = sellerMap.get(seller) || {
      count: 0,
      total: 0,
      profit: 0,
    };
    sellerData.count += 1;
    sellerData.total += toNumber(sale.total);

    const hour = Number(hourFormatter.format(sale.createdAt)) % 24;
    hourly[hour].count += 1;
    hourly[hour].revenue += toNumber(sale.total);

    for (const item of sale.items) {
      const itemProfit =
        (toNumber(item.unitPrice) - toNumber(item.unitCost)) *
        toNumber(item.quantity);
      sellerData.profit += itemProfit;

      const productData = productMap.get(item.productId) || {
        name: item.product.name,
        unit: item.product.unit,
        quantity: 0,
        total: 0,
        profit: 0,
      };
      productData.quantity += toNumber(item.quantity);
      productData.total += toNumber(item.total);
      productData.profit += itemProfit;
      productMap.set(item.productId, productData);

      const product = productById.get(item.productId);
      const supplier = supplierMetric(
        product?.supplier?.name || "Без поставщика",
      );
      supplier.revenue += toNumber(item.total);
      supplier.profit += itemProfit;
    }
    sellerMap.set(seller, sellerData);
  }

  const activeHours = hourly.filter((item) => item.count > 0);
  const maxHourlyRevenue = Math.max(
    ...activeHours.map((item) => item.revenue),
    1,
  );
  const peakHour = [...activeHours].sort((a, b) => b.count - a.count)[0];
  const noSales = products.filter(
    (product) => product.active && !productMap.has(product.id),
  );
  const lowStock = products.filter(
    (product) => product.active && product.stock.lte(product.minStock),
  );
  const inventoryCost = products
    .filter((product) => product.active)
    .reduce(
      (sum, product) => sum + toNumber(product.stock) * toNumber(product.cost),
      0,
    );
  const inventoryRetail = products
    .filter((product) => product.active)
    .reduce(
      (sum, product) => sum + toNumber(product.stock) * toNumber(product.price),
      0,
    );
  const writeOffs = movements.filter(
    (movement) => movement.type === "WRITE_OFF",
  );
  const writeOffCost = writeOffs.reduce(
    (sum, movement) =>
      sum +
      Math.abs(toNumber(movement.quantity)) * toNumber(movement.product.cost),
    0,
  );

  const metrics = [
    [
      "Выручка",
      formatMoney(revenue),
      TrendingUp,
      "text-emerald-700 bg-emerald-50",
    ],
    ["Прибыль", formatMoney(profit), BarChart3, "text-teal-700 bg-teal-50"],
    ["Продажи", String(completed.length), Users, "text-sky-700 bg-sky-50"],
    [
      "Скидки",
      formatMoney(discountTotal),
      Tags,
      "text-violet-700 bg-violet-50",
    ],
    [
      "Возвраты",
      `${returned.length} / ${pendingReturns.length} на проверке`,
      RotateCcw,
      "text-rose-700 bg-rose-50",
    ],
    [
      "Списания",
      formatMoney(writeOffCost),
      PackageX,
      "text-amber-700 bg-amber-50",
    ],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Отчёты и аналитика</h2>
          <p className="text-muted-foreground">
            {periodLabels[days]} · с{" "}
            {from.toLocaleDateString("ru-RU", { timeZone: "Asia/Bishkek" })}
            {peakHour
              ? ` · пик продаж: ${String(peakHour.hour).padStart(2, "0")}:00`
              : ""}
          </p>
        </div>
        <ReportActions days={days} />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {[1, 7, 30].map((period) => (
          <Button
            key={period}
            asChild
            variant={period === days ? "default" : "outline"}
            size="sm"
          >
            <Link href={`/admin/reports?days=${period}`}>
              {periodLabels[period]}
            </Link>
          </Button>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([title, value, Icon, color]) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {title}
              </CardTitle>
              <span className={`rounded-xl p-2 ${color}`}>
                <Icon className="size-5" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 /> Продажи по часам
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeHours.length ? (
              <div className="space-y-3">
                {activeHours.map((item) => (
                  <div
                    key={item.hour}
                    className="grid grid-cols-[54px_1fr_auto] items-center gap-3 text-sm"
                  >
                    <span className="font-mono font-semibold">
                      {String(item.hour).padStart(2, "0")}:00
                    </span>
                    <div className="h-8 overflow-hidden rounded-lg bg-muted">
                      <div
                        className="flex h-full min-w-8 items-center justify-end rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground"
                        style={{
                          width: `${Math.max((item.revenue / maxHourlyRevenue) * 100, 8)}%`,
                        }}
                      >
                        {item.count}
                      </div>
                    </div>
                    <span className="w-28 text-right font-semibold">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                За выбранный период продаж нет
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users /> Продажи по сотрудникам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продавец</TableHead>
                  <TableHead>Чеки</TableHead>
                  <TableHead>Прибыль</TableHead>
                  <TableHead className="text-right">Выручка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...sellerMap.entries()]
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([name, data]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell>{formatMoney(data.profit)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(data.total)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck /> Отчёт по поставщикам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Поставщик</TableHead>
                <TableHead>Товаров</TableHead>
                <TableHead>Низкий остаток</TableHead>
                <TableHead>Запас по закупке</TableHead>
                <TableHead>Продано</TableHead>
                <TableHead className="text-right">Прибыль</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...supplierMap.values()]
                .sort(
                  (a, b) => b.revenue - a.revenue || b.stockCost - a.stockCost,
                )
                .map((supplier) => (
                  <TableRow key={supplier.name}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.productCount}</TableCell>
                    <TableCell>
                      {supplier.lowStockCount ? (
                        <Badge variant="warning">
                          {supplier.lowStockCount}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{formatMoney(supplier.stockCost)}</TableCell>
                    <TableCell>{formatMoney(supplier.revenue)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(supplier.profit)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Самые продаваемые товары</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Прибыль</TableHead>
                  <TableHead className="text-right">Выручка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...productMap.values()]
                  .sort((a, b) => b.quantity - a.quantity)
                  .slice(0, 15)
                  .map((product) => (
                    <TableRow key={product.name}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        {formatQuantity(product.quantity, product.unit)}
                      </TableCell>
                      <TableCell>{formatMoney(product.profit)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(product.total)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse /> Стоимость остатков
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">По закупке</p>
                <p className="text-xl font-bold">
                  {formatMoney(inventoryCost)}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">По рознице</p>
                <p className="text-xl font-bold">
                  {formatMoney(inventoryRetail)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="font-semibold text-amber-900">Низкий остаток</p>
                <p className="text-sm text-amber-800">
                  Требует заказа поставщику
                </p>
              </div>
              <Badge variant="warning">{lowStock.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes /> Товары без продаж
          </CardTitle>
        </CardHeader>
        <CardContent>
          {noSales.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {noSales.map((product) => (
                <div key={product.id} className="rounded-xl border p-3">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Остаток: {formatQuantity(product.stock, product.unit)} ·{" "}
                    {product.supplier?.name || "Без поставщика"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Все активные товары продавались в выбранном периоде
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
