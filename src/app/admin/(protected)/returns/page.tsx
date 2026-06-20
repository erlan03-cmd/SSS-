import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { approveReturnAction, rejectReturnAction } from "@/app/admin/(protected)/returns/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getReturnRequests } from "@/lib/data";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

const labels = { PENDING: "Ожидает", APPROVED: "Одобрен", REJECTED: "Отклонён" } as const;

export default async function ReturnsPage() {
  const requests = await getReturnRequests();
  return <div className="space-y-6"><div><h2 className="text-3xl font-bold">Возвраты</h2><p className="text-muted-foreground">Продавец отправляет запрос, остаток возвращается только после одобрения</p></div><div className="space-y-4">{requests.length ? requests.map((request) => <Card key={request.id} className={request.status === "PENDING" ? "border-amber-300" : ""}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><RotateCcw /> {request.sale.receiptNumber || request.sale.id}</CardTitle><Badge variant={request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "destructive" : "warning"}>{labels[request.status]}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 text-sm md:grid-cols-4"><div><p className="text-muted-foreground">Продавец</p><p className="font-semibold">{request.employee.name}</p></div><div><p className="text-muted-foreground">Дата запроса</p><p>{formatDate(request.createdAt)}</p></div><div><p className="text-muted-foreground">Сумма чека</p><p className="font-semibold">{formatMoney(request.sale.total)}</p></div><div><p className="text-muted-foreground">Причина</p><p>{request.reason}</p></div></div><div className="rounded-xl bg-muted/50 p-3">{request.sale.items.map((item) => <p key={item.id} className="text-sm">{item.product.name} · {formatQuantity(item.quantity, item.product.unit)}</p>)}</div>{request.status === "PENDING" ? <div className="grid gap-2 md:grid-cols-2"><form action={approveReturnAction} className="flex gap-2"><input type="hidden" name="id" value={request.id} /><Input name="adminNote" placeholder="Комментарий администратора" /><Button className="bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 /> Одобрить</Button></form><form action={rejectReturnAction} className="flex gap-2"><input type="hidden" name="id" value={request.id} /><Input name="adminNote" placeholder="Причина отказа" /><Button variant="destructive"><XCircle /> Отклонить</Button></form></div> : request.adminNote ? <p className="text-sm text-muted-foreground">Комментарий: {request.adminNote}</p> : null}</CardContent></Card>) : <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Запросов на возврат нет</div>}</div></div>;
}
