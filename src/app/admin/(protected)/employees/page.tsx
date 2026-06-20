import {
  CalendarDays,
  KeyRound,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  resetEmployeePasswordAction,
  toggleEmployeeAction,
  updateEmployeeAction,
} from "@/app/admin/(protected)/employees/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getEmployees } from "@/lib/data";
import { formatDate, toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const successMessages: Record<string, string> = {
  created: "Сотрудник создан и может войти в кассу.",
  updated: "Данные сотрудника сохранены.",
  password: "Пароль изменён. Все старые сессии завершены.",
  enabled: "Доступ сотрудника включён.",
  disabled: "Доступ сотрудника отключён.",
  deleted: "Сотрудник удалён из списка, история операций сохранена.",
};

const errorMessages: Record<string, string> = {
  invalid: "Проверьте имя, логин и скидку. Логин: 3–32 символа латиницей, цифрами, точкой, дефисом или подчёркиванием.",
  login_taken: "Этот логин уже используется другим сотрудником.",
  not_found: "Сотрудник не найден или уже удалён.",
  password_short: "Пароль должен содержать минимум 6 символов.",
};

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EmployeesPage({ searchParams }: PageProps) {
  const [employees, params] = await Promise.all([getEmployees(), searchParams]);
  const activeCount = employees.filter((employee) => employee.active).length;
  const success = params.success ? successMessages[params.success] : null;
  const error = params.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Пользователи и доступ</h2>
          <p className="text-muted-foreground">
            Логины, роли, скидки, пароли и доступ сотрудников к кассе
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="success">Активны: {activeCount}</Badge>
          <Badge variant="secondary">Всего: {employees.length}</Badge>
        </div>
      </div>

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit xl:sticky xl:top-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus /> Новый сотрудник
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createEmployeeAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Имя</Label>
                <Input id="new-name" name="name" placeholder="Например, Азамат" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-login">Логин</Label>
                <Input
                  id="new-login"
                  name="login"
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9._-]+"
                  autoCapitalize="none"
                  autoComplete="off"
                  placeholder="azamat"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Пароль</Label>
                <Input
                  id="new-password"
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-role">Роль</Label>
                  <Select id="new-role" name="role">
                    <option value="SELLER">Продавец</option>
                    <option value="ADMIN">Администратор</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-discount">Скидка, %</Label>
                  <Input
                    id="new-discount"
                    name="maxDiscountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue="5"
                    required
                  />
                </div>
              </div>
              <Button className="w-full">
                <UserPlus /> Создать аккаунт
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {employees.length ? (
            employees.map((employee) => (
              <Card key={employee.id} className={!employee.active ? "border-slate-300 bg-slate-50/60" : ""}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {employee.name}
                        <Badge variant={employee.active ? "success" : "secondary"}>
                          {employee.active ? "Активен" : "Отключён"}
                        </Badge>
                        <Badge variant={employee.role === "ADMIN" ? "default" : "outline"}>
                          {employee.role === "ADMIN" ? "Администратор" : "Продавец"}
                        </Badge>
                      </CardTitle>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">@{employee.login}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="size-3.5" /> Продаж: {employee._count.sales}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(employee.createdAt)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <form action={updateEmployeeAction} className="space-y-3 rounded-xl border bg-background p-4">
                    <input type="hidden" name="id" value={employee.id} />
                    <p className="flex items-center gap-2 text-sm font-semibold"><Pencil className="size-4" /> Основные данные</p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>Имя</Label>
                        <Input name="name" defaultValue={employee.name} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Логин</Label>
                        <Input
                          name="login"
                          defaultValue={employee.login}
                          minLength={3}
                          maxLength={32}
                          pattern="[A-Za-z0-9._-]+"
                          autoCapitalize="none"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Роль</Label>
                        <Select name="role" defaultValue={employee.role}>
                          <option value="SELLER">Продавец</option>
                          <option value="ADMIN">Администратор</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Макс. скидка, %</Label>
                        <Input
                          name="maxDiscountPercent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={toNumber(employee.maxDiscountPercent)}
                          required
                        />
                      </div>
                    </div>
                    <Button size="sm">
                      <Save /> Сохранить изменения
                    </Button>
                  </form>

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <form action={resetEmployeePasswordAction} className="flex flex-col gap-2 rounded-xl border bg-background p-4 sm:flex-row sm:items-end">
                      <input type="hidden" name="id" value={employee.id} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Label>Новый пароль</Label>
                        <Input
                          name="password"
                          type="password"
                          minLength={6}
                          autoComplete="new-password"
                          placeholder="Минимум 6 символов"
                          required
                        />
                      </div>
                      <Button size="sm" variant="outline">
                        <KeyRound /> Сменить пароль
                      </Button>
                    </form>

                    <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-background p-4">
                      <form action={toggleEmployeeAction}>
                        <input type="hidden" name="id" value={employee.id} />
                        <input type="hidden" name="active" value={String(!employee.active)} />
                        <Button size="sm" variant="outline">
                          {employee.active ? <><UserX /> Отключить</> : <><UserCheck /> Включить</>}
                        </Button>
                      </form>
                      <form action={deleteEmployeeAction}>
                        <input type="hidden" name="id" value={employee.id} />
                        <ConfirmSubmitButton
                          size="sm"
                          variant="destructive"
                          message={`Удалить пользователя «${employee.name}»? Доступ будет закрыт, но история продаж сохранится.`}
                        >
                          <Trash2 /> Удалить
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>

                  {employee.role === "ADMIN" ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="size-4" /> Роль администратора разрешает повышенный лимит скидки в кассе.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              Сотрудников пока нет. Создайте первый аккаунт слева.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
