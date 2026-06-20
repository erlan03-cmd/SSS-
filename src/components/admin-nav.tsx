"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileBarChart,
  LogOut,
  PackageCheck,
  RotateCcw,
  ShoppingBasket,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: BarChart3 },
  { href: "/admin/products", label: "Товары", icon: Boxes },
  { href: "/admin/warehouse", label: "Склад", icon: PackageCheck },
  { href: "/admin/orders", label: "Заказать", icon: ShoppingBasket },
  { href: "/admin/reports", label: "Отчёты", icon: FileBarChart },
  { href: "/admin/shifts", label: "Смены", icon: WalletCards },
  { href: "/admin/employees", label: "Сотрудники", icon: Users },
  { href: "/admin/returns", label: "Возвраты", icon: RotateCcw },
  { href: "/admin/history", label: "История", icon: ClipboardList },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-sm font-medium text-primary">SSS+ склад</p>
          <h1 className="text-xl font-semibold">Админ</h1>
        </div>
        <nav className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="shrink-0"
              >
                <Link href={item.href}>
                  <Icon />
                  {item.label}
                </Link>
              </Button>
            );
          })}
          <Button asChild variant="outline" size="sm">
            <Link href="/cash">
              <Store />
              Касса
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn("text-muted-foreground hover:text-foreground")}
          >
            <Link href="/admin/logout">
              <LogOut />
              Выйти
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
