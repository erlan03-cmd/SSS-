"use client";

import {
  Barcode,
  Boxes,
  Clock3,
  PackagePlus,
  ReceiptText,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPurchaseAction, recordSaleAction } from "@/app/cash/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CashProduct, OperationHistoryItem } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { initialActionState } from "@/lib/inventory";
import { cn } from "@/lib/utils";

type Props = {
  products: CashProduct[];
  history: OperationHistoryItem[];
};

const stockLabels: Record<CashProduct["stockStatus"], string> = {
  available: "Есть",
  low: "Мало",
  out: "Нет",
};

const statusClasses: Record<CashProduct["stockStatus"], string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  low: "border-amber-200 bg-amber-50 text-amber-800",
  out: "border-rose-200 bg-rose-50 text-rose-700",
};

function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className="h-12 w-full text-base" disabled={pending || disabled}>
      {pending ? "Записываем..." : children}
    </Button>
  );
}

export function CashRegister({ products, history }: Props) {
  const [mode, setMode] = useState<"sale" | "purchase">("sale");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [saleState, saleAction] = useActionState(
    recordSaleAction,
    initialActionState,
  );
  const [purchaseState, purchaseAction] = useActionState(
    recordPurchaseAction,
    initialActionState,
  );

  const selectedProduct = products.find((product) => product.id === selectedId);
  const normalizedQuery = query.trim().toLowerCase();

  const visibleProducts = useMemo(() => {
    if (!normalizedQuery) {
      return products.slice(0, 12);
    }

    return products
      .filter((product) => {
        const haystack = [
          product.name,
          product.barcode ?? "",
          product.categoryName,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 12);
  }, [normalizedQuery, products]);

  useEffect(() => {
    if (saleState.ok) {
      setSaleQuantity("1");
    }
  }, [saleState.version, saleState.ok]);

  useEffect(() => {
    if (purchaseState.ok) {
      setPurchaseQuantity("1");
      setPurchaseCost("");
    }
  }, [purchaseState.version, purchaseState.ok]);

  function selectProduct(product: CashProduct) {
    setSelectedId(product.id);
    setQuery(product.name);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по товару, категории или штрихкоду"
                className="h-16 rounded-md pl-14 text-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:w-72">
              <Button
                type="button"
                size="lg"
                variant={mode === "sale" ? "default" : "outline"}
                onClick={() => setMode("sale")}
              >
                <ShoppingCart />
                Продажа
              </Button>
              <Button
                type="button"
                size="lg"
                variant={mode === "purchase" ? "default" : "outline"}
                onClick={() => setMode("purchase")}
              >
                <PackagePlus />
                Закупка
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {visibleProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => selectProduct(product)}
              className={cn(
                "min-h-28 rounded-lg border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-soft",
                selectedId === product.id && "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold leading-snug">
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {product.categoryName}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                    statusClasses[product.stockStatus],
                  )}
                >
                  {stockLabels[product.stockStatus]}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {formatMoney(product.price)} / {product.unit}
                </span>
                {product.barcode ? (
                  <span className="inline-flex items-center gap-1">
                    <Barcode className="size-4" />
                    {product.barcode}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{mode === "sale" ? "Записать продажу" : "Записать закупку"}</CardTitle>
              <Badge variant={mode === "sale" ? "success" : "warning"}>
                {mode === "sale" ? "Касса" : "Приход"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProduct ? (
              <div className="rounded-md border border-border bg-muted/40 p-4">
                <p className="font-semibold">{selectedProduct.name}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{formatMoney(selectedProduct.price)} / {selectedProduct.unit}</span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium",
                      statusClasses[selectedProduct.stockStatus],
                    )}
                  >
                    {stockLabels[selectedProduct.stockStatus]}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Выберите товар
              </div>
            )}

            {mode === "sale" ? (
              <form action={saleAction} className="space-y-4">
                <input type="hidden" name="productId" value={selectedProduct?.id ?? ""} />
                <div className="space-y-2">
                  <Label htmlFor="sale-quantity">Количество</Label>
                  <Input
                    id="sale-quantity"
                    name="quantity"
                    inputMode="decimal"
                    value={saleQuantity}
                    onChange={(event) => setSaleQuantity(event.target.value)}
                    className="h-12 text-lg"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {["1", "2", "5", "10"].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        onClick={() => setSaleQuantity(value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale-note">Комментарий</Label>
                  <Textarea id="sale-note" name="note" rows={2} />
                </div>
                {saleState.message ? (
                  <p
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      saleState.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    )}
                  >
                    {saleState.message}
                  </p>
                ) : null}
                <SubmitButton disabled={!selectedProduct}>
                  <ReceiptText />
                  Записать продажу
                </SubmitButton>
              </form>
            ) : (
              <form action={purchaseAction} className="space-y-4">
                <input type="hidden" name="productId" value={selectedProduct?.id ?? ""} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-quantity">Количество</Label>
                    <Input
                      id="purchase-quantity"
                      name="quantity"
                      inputMode="decimal"
                      value={purchaseQuantity}
                      onChange={(event) => setPurchaseQuantity(event.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase-cost">Цена закупки</Label>
                    <Input
                      id="purchase-cost"
                      name="unitCost"
                      inputMode="decimal"
                      value={purchaseCost}
                      onChange={(event) => setPurchaseCost(event.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-note">Комментарий</Label>
                  <Textarea id="purchase-note" name="note" rows={2} />
                </div>
                {purchaseState.message ? (
                  <p
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      purchaseState.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    )}
                  >
                    {purchaseState.message}
                  </p>
                ) : null}
                <SubmitButton disabled={!selectedProduct}>
                  <PackagePlus />
                  Записать закупку
                </SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-primary" />
              Последние операции
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length ? (
              history.map((operation) => (
                <div
                  key={`${operation.type}-${operation.id}`}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {operation.type === "sale" ? "Продажа" : "Закупка"}
                    </p>
                    <span className="text-sm font-semibold">
                      {formatMoney(operation.total)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {operation.details}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(operation.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <Boxes className="size-5" />
                Операций пока нет
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
