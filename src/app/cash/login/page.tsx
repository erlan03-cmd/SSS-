import { KeyRound, Lightbulb, ShieldCheck } from "lucide-react";
import { employeeLoginAction } from "@/app/cash/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function CashLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,hsl(var(--accent)),transparent_45%)] px-4 py-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Lightbulb className="size-7" />
          </div>
          <CardTitle className="text-2xl">Вход продавца</CardTitle>
          <CardDescription>Магазин электрики и освещения · быстрая касса</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={employeeLoginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input id="login" name="login" autoComplete="username" required className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 text-base" />
            </div>
            {params.error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Неверный логин или пароль</p>
            ) : null}
            <Button className="h-12 w-full text-base">
              <KeyRound /> Войти в кассу
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" /> Каждый чек сохраняется с именем продавца
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
