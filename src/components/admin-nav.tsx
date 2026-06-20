"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LogOut,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: BarChart3 },
  { href: "/admin/products", label: "Товары", icon: Boxes },
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
        <nav className="flex flex-wrap items-center gap-2">
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
