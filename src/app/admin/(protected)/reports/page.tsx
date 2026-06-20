import { BarChart3, Boxes, PackageX, TrendingUp, Users } from "lucide-react";
import { ReportActions } from "@/components/report-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReportData } from "@/lib/data";
import { formatMoney, formatQuantity, toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { from, sales, products, movements } = await getReportData(30);
  const completed = sales.filter((sale) => sale.status === "COMPLETED");
  const revenue = completed.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const profit = completed.flatMap((sale) => sale.items).reduce((sum, item) => sum + (toNumber(item.unitPrice) - toNumber(item.unitCost)) * toNumber(item.quantity), 0);
  const sellerMap = new Map<string, { count: number; total: number }>();
  const productMap = new Map<string, { name: string; quantity: number; total: number }>();
  for (const sale of completed) {
    const seller = sale.employee?.name || "Без продавца"; const s = sellerMap.get(seller) || { count: 0, total: 0 }; s.count++; s.total += toNumber(sale.total); sellerMap.set(seller, s);
    for (const item of sale.items) { const p = productMap.get(item.productId) || { name: item.product.name, quantity: 0, total: 0 }; p.quantity += toNumber(item.quantity); p.total += toNumber(item.total); productMap.set(item.productId, p); }
  }
  const noSales = products.filter((product) => !productMap.has(product.id));
  const writeOffs = movements.filter((movement) => movement.type === "WRITE_OFF");
  return <div className="space-y-6"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-3xl font-bold">Отчёты</h2><p className="text-muted-foreground">Период с {from.toLocaleDateString("ru-RU")} · последние 30 дней</p></div><ReportActions /></div><section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[["Выручка", formatMoney(revenue), TrendingUp],["Прибыль", formatMoney(profit), BarChart3],["Продажи", String(completed.length), Users],["Списания", String(writeOffs.length), PackageX]].map(([title,value,Icon]) => { const I=Icon as typeof TrendingUp; return <Card key={String(title)}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{title as string}</CardTitle><I className="size-5 text-primary" /></CardHeader><CardContent><p className="text-2xl font-bold">{value as string}</p></CardContent></Card>; })}</section><section className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>Продажи по сотрудникам</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Продавец</TableHead><TableHead>Чеки</TableHead><TableHead className="text-right">Выручка</TableHead></TableRow></TableHeader><TableBody>{[...sellerMap.entries()].sort((a,b)=>b[1].total-a[1].total).map(([name,data]) => <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell>{data.count}</TableCell><TableCell className="text-right">{formatMoney(data.total)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle>Самые продаваемые товары</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Количество</TableHead><TableHead className="text-right">Выручка</TableHead></TableRow></TableHeader><TableBody>{[...productMap.values()].sort((a,b)=>b.quantity-a.quantity).slice(0,15).map((product) => <TableRow key={product.name}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.quantity}</TableCell><TableCell className="text-right">{formatMoney(product.total)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></section><Card><CardHeader><CardTitle className="flex items-center gap-2"><Boxes /> Товары без продаж</CardTitle></CardHeader><CardContent>{noSales.length ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{noSales.map((product) => <div key={product.id} className="rounded-xl border p-3"><p className="font-medium">{product.name}</p><p className="text-sm text-muted-foreground">Остаток: {formatQuantity(product.stock, product.unit)} · {product.supplier?.name || "Без поставщика"}</p></div>)}</div> : <p className="text-muted-foreground">Все товары продавались в выбранном периоде</p>}</CardContent></Card></div>;
}
