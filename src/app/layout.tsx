import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSS+ учет склада",
  description: "Внутренняя система учета товаров строительной компании",
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
