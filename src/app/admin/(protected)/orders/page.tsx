import { CheckCircle2, Clock3, ShoppingBasket } from "lucide-react";
import { setOrderStatusAction } from "@/app/admin/(protected)/orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReorderData } from "@/lib/data";
import { formatMoney, formatQuantity, toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const labels = { NEEDS_ORDER: "Нужно заказать", ORDERED: "Заказано", RECEIVED: "Получено" } as const;

export default async function OrdersPage() {
  const products = await getReorderData();
  return <div className="space-y-6"><div><h2 className="text-3xl font-bold">Нужно заказать</h2><p className="text-muted-foreground">Товары автоматически появляются здесь при достижении минимального остатка</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBasket /> Список закупки <Badge variant="warning">{products.length}</Badge></CardTitle></CardHeader><CardContent>{products.length ? <Table><TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Остаток / минимум</TableHead><TableHead>Поставщик</TableHead><TableHead>Последняя цена</TableHead><TableHead>Заказать</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader><TableBody>{products.map((product) => {
    const status = product.reorderItem?.status || "NEEDS_ORDER";
    const recommended = product.reorderItem ? toNumber(product.reorderItem.recommendedQty) : toNumber(product.recommendedOrderQty) || Math.max(toNumber(product.minStock) * 2 - toNumber(product.stock), 1);
    return <TableRow key={product.id}><TableCell><p className="font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{product.category.name} · {product.sku || "без артикула"}</p></TableCell><TableCell><span className="text-rose-700">{formatQuantity(product.stock, product.unit)}</span> / {formatQuantity(product.minStock, product.unit)}</TableCell><TableCell>{product.supplier?.name || "Не указан"}</TableCell><TableCell>{formatMoney(product.cost)}</TableCell><TableCell>{formatQuantity(recommended, product.unit)}</TableCell><TableCell><form action={setOrderStatusAction} className="flex flex-wrap gap-2"><input type="hidden" name="productId" value={product.id} /><Input name="recommendedQty" defaultValue={recommended} className="h-9 w-20" />{status === "NEEDS_ORDER" ? <Button name="status" value="ORDERED" size="sm"><Clock3 /> Заказано</Button> : null}{status === "ORDERED" ? <Button name="status" value="RECEIVED" size="sm" variant="outline"><CheckCircle2 /> Получено</Button> : null}<Badge variant={status === "RECEIVED" ? "success" : "warning"}>{labels[status]}</Badge></form></TableCell></TableRow>;
  })}</TableBody></Table> : <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-600" />Все товары в достаточном количестве</div>}</CardContent></Card></div>;
}
