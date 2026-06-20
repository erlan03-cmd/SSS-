import Link from "next/link";
import { Edit3, Plus } from "lucide-react";
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
import { getAdminProducts } from "@/lib/data";
import { formatMoney, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getAdminProducts();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Товары</h2>
          <p className="text-sm text-muted-foreground">
            Всего позиций: {products.length}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus />
            Добавить товар
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Остатки и цены</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Штрихкод</TableHead>
                <TableHead className="text-right">Остаток</TableHead>
                <TableHead className="text-right">Мин.</TableHead>
                <TableHead className="text-right">Себест.</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const isLow = product.stock.lte(product.minStock);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <p>{product.name}</p>
                        {isLow ? <Badge variant="warning">Низкий остаток</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.barcode || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(product.stock, product.unit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(product.minStock, product.unit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(product.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(product.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/products/${product.id}`}>
                          <Edit3 />
                          Редактировать
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
