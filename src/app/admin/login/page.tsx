import Link from "next/link";
import { KeyRound, Store } from "lucide-react";
import { loginAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    missing_secret?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="size-6" />
          </div>
          <CardTitle>Вход владельца</CardTitle>
          <CardDescription>Доступ к остаткам, аналитике и управлению товарами</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret">Секретный ключ</Label>
              <Input
                id="secret"
                name="secret"
                type="password"
                autoComplete="current-password"
                className="h-12"
              />
            </div>
            {params.error ? (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Неверный ключ
              </p>
            ) : null}
            {params.missing_secret ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Укажите ADMIN_SECRET_KEY в переменных окружения
              </p>
            ) : null}
            <Button className="h-12 w-full">
              <Store />
              Войти
            </Button>
          </form>
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link href="/cash">Вернуться в кассу</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
