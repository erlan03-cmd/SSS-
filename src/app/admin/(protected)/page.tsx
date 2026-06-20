import Link from "next/link";
import { AlertTriangle, Banknote, Boxes, ChevronRight, CircleDollarSign, CreditCard, QrCode, ReceiptText, RotateCcw, TrendingUp, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const dashboard = await getDashboardData();
  const metrics = [
    ["Выручка сегодня", formatMoney(dashboard.todaySales), `${dashboard.todaySaleCount} чеков`, CircleDollarSign, "bg-emerald-50 text-emerald-700"],
    ["Прибыль сегодня", formatMoney(dashboard.todayProfit), "После себестоимости", TrendingUp, "bg-teal-50 text-teal-700"],
    ["Наличные", formatMoney(dashboard.paymentTotals.CASH), "За сегодня", Banknote, "bg-amber-50 text-amber-700"],
    ["Карта", formatMoney(dashboard.paymentTotals.CARD), "За сегодня", CreditCard, "bg-sky-50 text-sky-700"],
    ["QR и перевод", formatMoney(dashboard.paymentTotals.QR + dashboard.paymentTotals.TRANSFER), "За сегодня", QrCode, "bg-violet-50 text-violet-700"],
    ["Склад: закупка", formatMoney(dashboard.inventoryCost), `Розница: ${formatMoney(dashboard.inventoryRetail)}`, Boxes, "bg-slate-100 text-slate-700"],
    ["Продажи за месяц", formatMoney(dashboard.monthSales), `Прибыль: ${formatMoney(dashboard.monthProfit)}`, Wallet, "bg-indigo-50 text-indigo-700"],
    ["Возвраты на проверке", String(dashboard.pendingReturns), "Требуют решения", RotateCcw, "bg-rose-50 text-rose-700"],
  ] as const;

  return <div className="space-y-6">
    <section className="metric-band rounded-2xl border bg-card p-5 shadow-soft"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-primary">Контроль магазина в реальном времени</p><h2 className="text-3xl font-bold">Панель владельца</h2><p className="mt-1 text-sm text-muted-foreground">Электрика и освещение · KGS</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/admin/warehouse">Поступление</Link></Button><Button asChild><Link href="/admin/products/new">Добавить товар <ChevronRight /></Link></Button></div></div></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([title, value, hint, Icon, color]) => <Card key={title}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle><span className={`rounded-xl p-2 ${color}`}><Icon className="size-5" /></span></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></CardContent></Card>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="size-5" /> Последние продажи</CardTitle></CardHeader><CardContent>{dashboard.recentSales.length ? <Table><TableHeader><TableRow><TableHead>Чек</TableHead><TableHead>Продавец</TableHead><TableHead>Оплата</TableHead><TableHead>Время</TableHead><TableHead className="text-right">Сумма</TableHead></TableRow></TableHeader><TableBody>{dashboard.recentSales.map((sale) => <TableRow key={sale.id}><TableCell className="font-medium">{sale.receiptNumber || "—"}</TableCell><TableCell>{sale.employee?.name || "—"}</TableCell><TableCell>{sale.paymentMethod}</TableCell><TableCell className="text-muted-foreground">{formatDate(sale.createdAt)}</TableCell><TableCell className="text-right font-semibold">{formatMoney(sale.total)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Сегодня продаж ещё нет</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" /> Продажи по продавцам</CardTitle></CardHeader><CardContent className="space-y-3">{dashboard.sellerSales.length ? dashboard.sellerSales.map((seller) => <div key={seller.name} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{seller.name}</p><p className="text-xs text-muted-foreground">{seller.count} чеков</p></div><p className="font-bold">{formatMoney(seller.total)}</p></div>) : <p className="text-sm text-muted-foreground">Нет данных</p>}</CardContent></Card>
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-600" /> Нужно заказать</CardTitle><Badge variant="warning">{dashboard.lowStockProducts.length}</Badge></CardHeader><CardContent>{dashboard.lowStockProducts.length ? <Table><TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Остаток</TableHead><TableHead>Заказать</TableHead></TableRow></TableHeader><TableBody>{dashboard.lowStockProducts.slice(0, 10).map((product) => <TableRow key={product.id}><TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.supplierName}</p></TableCell><TableCell>{formatQuantity(product.stock, product.unit)}</TableCell><TableCell className="font-semibold">{formatQuantity(product.recommendedOrderQty, product.unit)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Все остатки в норме</p>}<Button asChild variant="outline" className="mt-4 w-full"><Link href="/admin/orders">Открыть список заказа</Link></Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Топ товаров сегодня</CardTitle></CardHeader><CardContent className="space-y-3">{dashboard.topProducts.length ? dashboard.topProducts.map((product, index) => <div key={product.name} className="flex items-center gap-3 rounded-xl border p-3"><span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-medium">{product.name}</p><p className="text-xs text-muted-foreground">Продано: {product.quantity}</p></div><p className="font-semibold">{formatMoney(product.total)}</p></div>) : <p className="text-sm text-muted-foreground">Сегодня данных пока нет</p>}</CardContent></Card>
    </section>
  </div>;
}
