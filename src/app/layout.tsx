import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSS+ · электрика и освещение",
  description: "Система учёта, склада и быстрых продаж магазина электрики",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
