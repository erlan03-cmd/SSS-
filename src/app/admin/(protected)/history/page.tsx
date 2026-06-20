import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { getFullHistory } from "@/lib/data";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const operations = await getFullHistory(120);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">История операций</h2>
        <p className="text-sm text-muted-foreground">
          Последние {operations.length} продаж и закупок
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Продажи и закупки</CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Позиции</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((operation) => (
                  <TableRow key={`${operation.type}-${operation.id}`}>
                    <TableCell>
                      {operation.type === "sale" ? (
                        <Badge variant="success" className="gap-1">
                          <ArrowUpCircle className="size-3.5" />
                          Продажа
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <ArrowDownCircle className="size-3.5" />
                          Закупка
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(operation.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {operation.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-muted-foreground">
                              {formatQuantity(item.quantity, item.unit)} ·{" "}
                              {"unitPrice" in item
                                ? `${formatMoney(item.unitPrice)} продажа · ${formatMoney(item.unitCost)} себест.`
                                : `${formatMoney(item.unitCost)} закупка`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(operation.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Операций пока нет
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
