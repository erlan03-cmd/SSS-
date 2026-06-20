import { ShieldCheck, UserCheck, UserPlus, UserX } from "lucide-react";
import {
  createEmployeeAction,
  resetEmployeePasswordAction,
  toggleEmployeeAction,
} from "@/app/admin/(protected)/employees/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmployees } from "@/lib/data";
import { toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await getEmployees();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Сотрудники</h2>
        <p className="text-muted-foreground">
          Отдельные аккаунты продавцов и контроль разрешённой скидки
        </p>
      </div>
      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus /> Новый сотрудник
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createEmployeeAction} className="space-y-3">
              <div>
                <Label>Имя</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>Логин</Label>
                <Input name="login" minLength={3} required />
              </div>
              <div>
                <Label>Пароль</Label>
                <Input name="password" type="password" minLength={6} required />
              </div>
              <div>
                <Label>Роль</Label>
                <Select name="role">
                  <option value="SELLER">Продавец</option>
                  <option value="ADMIN">Администратор</option>
                </Select>
              </div>
              <div>
                <Label>Максимальная скидка, %</Label>
                <Input
                  name="maxDiscountPercent"
                  defaultValue="5"
                  inputMode="decimal"
                />
              </div>
              <Button className="w-full">
                <UserPlus /> Создать аккаунт
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Команда магазина</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Продажи</TableHead>
                  <TableHead>Скидка</TableHead>
                  <TableHead>Новый пароль</TableHead>
                  <TableHead>Доступ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <p className="font-semibold">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.login}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          employee.role === "ADMIN" ? "default" : "secondary"
                        }
                      >
                        {employee.role === "ADMIN" ? (
                          <>
                            <ShieldCheck className="mr-1 size-3" /> Админ
                          </>
                        ) : (
                          "Продавец"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee._count.sales}</TableCell>
                    <TableCell>
                      до {toNumber(employee.maxDiscountPercent)}%
                    </TableCell>
                    <TableCell>
                      <form
                        action={resetEmployeePasswordAction}
                        className="flex gap-2"
                      >
                        <input type="hidden" name="id" value={employee.id} />
                        <Input
                          name="password"
                          type="password"
                          minLength={6}
                          placeholder="Новый пароль"
                          className="h-9 w-36"
                          required
                        />
                        <Button size="sm" variant="outline">
                          Сменить
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>
                      <form action={toggleEmployeeAction}>
                        <input type="hidden" name="id" value={employee.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(!employee.active)}
                        />
                        <Button
                          size="sm"
                          variant={employee.active ? "outline" : "default"}
                        >
                          {employee.active ? (
                            <>
                              <UserX /> Отключить
                            </>
                          ) : (
                            <>
                              <UserCheck /> Включить
                            </>
                          )}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
