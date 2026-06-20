import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  Coins,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatQuantity } from "@/lib/format";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const dashboard = await getDashboardData();

  const metrics = [
    {
      title: "Склад по себестоимости",
      value: formatMoney(dashboard.inventoryCost),
      hint: `Розница: ${formatMoney(dashboard.inventoryRetail)}`,
      icon: Boxes,
      color: "text-teal-700 bg-teal-50",
    },
    {
      title: "Продажи сегодня",
      value: formatMoney(dashboard.todaySales),
      hint: "Сумма чеков за день",
      icon: Coins,
      color: "text-amber-700 bg-amber-50",
    },
    {
      title: "Продажи за месяц",
      value: formatMoney(dashboard.monthSales),
      hint: "Текущий календарный месяц",
      icon: TrendingUp,
      color: "text-sky-700 bg-sky-50",
    },
    {
      title: "Доход за месяц",
      value: formatMoney(dashboard.monthProfit),
      hint: "Продажи минус себестоимость",
      icon: Wallet,
      color: "text-emerald-700 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="metric-band rounded-lg border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Полный доступ</p>
            <h2 className="text-2xl font-semibold md:text-3xl">Дашборд владельца</h2>
          </div>
          <Button asChild>
            <Link href="/admin/products/new">
              Добавить товар
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <span className={`rounded-md p-2 ${metric.color}`}>
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{metric.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            Низкий остаток
          </CardTitle>
          <Badge variant="warning">{dashboard.lowStockProducts.length}</Badge>
        </CardHeader>
        <CardContent>
          {dashboard.lowStockProducts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                  <TableHead className="text-right">Минимум</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.lowStockProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(product.stock, product.unit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(product.minStock, product.unit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Все товары выше минимального остатка
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
