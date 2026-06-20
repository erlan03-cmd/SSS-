import { ArrowDownToLine, ClipboardCheck, PackageMinus, Truck } from "lucide-react";
import { createSupplierAction, inventoryStockAction, receiveStockAction, writeOffStockAction } from "@/app/admin/(protected)/warehouse/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWarehouseData } from "@/lib/data";
import { formatDate, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const { products, movements, suppliers } = await getWarehouseData();
  const productOptions = products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatQuantity(product.stock, product.unit)}</option>);
  return <div className="space-y-6"><div><h2 className="text-3xl font-bold">Склад и остатки</h2><p className="text-muted-foreground">Поступления, списания и инвентаризация с журналом изменений</p></div>
    <section className="grid gap-4 xl:grid-cols-3">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownToLine className="text-emerald-600" /> Поступление</CardTitle></CardHeader><CardContent><form action={receiveStockAction} className="space-y-3"><Label>Товар</Label><Select name="productId" required>{productOptions}</Select><div className="grid grid-cols-2 gap-2"><Input name="quantity" inputMode="decimal" placeholder="Количество" required /><Input name="unitCost" inputMode="decimal" placeholder="Цена закупки" required /></div><Select name="supplierId"><option value="">Поставщик товара</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select><Input name="note" placeholder="Накладная / комментарий" /><Button className="w-full"><Truck /> Принять товар</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageMinus className="text-rose-600" /> Списание брака</CardTitle></CardHeader><CardContent><form action={writeOffStockAction} className="space-y-3"><Label>Товар</Label><Select name="productId" required>{productOptions}</Select><Input name="quantity" inputMode="decimal" placeholder="Количество" required /><Input name="note" placeholder="Причина списания" required /><Button variant="destructive" className="w-full"><PackageMinus /> Списать</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="text-sky-600" /> Инвентаризация</CardTitle></CardHeader><CardContent><form action={inventoryStockAction} className="space-y-3"><Label>Товар</Label><Select name="productId" required>{productOptions}</Select><Input name="actualStock" inputMode="decimal" placeholder="Фактический остаток" required /><Input name="note" placeholder="Комментарий" /><Button variant="outline" className="w-full"><ClipboardCheck /> Зафиксировать</Button></form><form action={createSupplierAction} className="mt-6 space-y-2 border-t pt-4"><p className="text-sm font-semibold">Новый поставщик</p><Input name="name" placeholder="Название" required /><Input name="phone" placeholder="Телефон" /><Button size="sm" variant="outline">Добавить поставщика</Button></form></CardContent></Card>
    </section>
    <Card><CardHeader><CardTitle>Журнал движения товара</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Операция</TableHead><TableHead>Товар</TableHead><TableHead>Изменение</TableHead><TableHead>Остаток</TableHead><TableHead>Кто / комментарий</TableHead></TableRow></TableHeader><TableBody>{movements.map((movement) => <TableRow key={movement.id}><TableCell className="text-muted-foreground">{formatDate(movement.createdAt)}</TableCell><TableCell><Badge variant={movement.quantity.isNegative() ? "destructive" : "success"}>{movement.type}</Badge></TableCell><TableCell className="font-medium">{movement.product.name}</TableCell><TableCell>{formatQuantity(movement.quantity, movement.product.unit)}</TableCell><TableCell>{formatQuantity(movement.stockAfter, movement.product.unit)}</TableCell><TableCell>{movement.employee?.name || "Владелец"}{movement.note ? ` · ${movement.note}` : ""}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </div>;
}
