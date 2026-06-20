"use client";

import { CheckSquare2, Printer, Search, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";

type LabelProduct = {
  id: string;
  name: string;
  barcode: string;
  sku: string | null;
  price: number;
};

export function BarcodeLabelManager({ products }: { products: LabelProduct[] }) {
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const normalized = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      products.filter((product) =>
        [product.name, product.barcode, product.sku]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      ),
    [normalized, products],
  );
  const labels = products.flatMap((product) =>
    Array.from(
      { length: Math.min(Math.max(quantities[product.id] ?? 0, 0), 100) },
      (_, index) => ({ product, key: `${product.id}-${index}` }),
    ),
  );

  function setQuantity(id: string, quantity: number) {
    setQuantities((current) => ({
      ...current,
      [id]: Math.min(Math.max(Number.isFinite(quantity) ? quantity : 0, 0), 100),
    }));
  }

  function selectVisible() {
    setQuantities((current) => {
      const next = { ...current };
      for (const product of visible) next[product.id] = Math.max(next[product.id] ?? 0, 1);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <section className="print:hidden space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название, артикул или штрихкод"
              className="h-12 pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={selectVisible}>
            <CheckSquare2 /> Выбрать найденные
          </Button>
          <Button type="button" disabled={!labels.length} onClick={() => window.print()}>
            <Printer /> Печать ({labels.length})
          </Button>
        </div>
        <div className="max-h-[55vh] divide-y overflow-auto rounded-xl border">
          {visible.map((product) => {
            const quantity = quantities[product.id] ?? 0;
            return (
              <div key={product.id} className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  aria-label={quantity ? "Убрать ценник" : "Выбрать ценник"}
                  onClick={() => setQuantity(product.id, quantity ? 0 : 1)}
                  className="text-primary"
                >
                  {quantity ? <CheckSquare2 /> : <Square />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.barcode} · {formatMoney(product.price)}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  Кол-во
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={quantity}
                    onChange={(event) => setQuantity(product.id, Number(event.target.value))}
                    className="h-10 w-20"
                  />
                </label>
              </div>
            );
          })}
          {!visible.length ? (
            <p className="p-8 text-center text-muted-foreground">Товары не найдены</p>
          ) : null}
        </div>
      </section>

      {labels.length ? (
        <section className="barcode-label-grid">
          {labels.map(({ product, key }) => (
            <article key={key} className="barcode-label">
              <p className="barcode-label-name">{product.name}</p>
              <p className="barcode-label-price">{product.price.toFixed(2)} сом</p>
              {/* SVG генерируется сервером и доступен только авторизованному владельцу. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/admin/products/barcode/${product.id}`}
                alt={`Штрихкод ${product.barcode}`}
              />
            </article>
          ))}
        </section>
      ) : (
        <div className="print:hidden rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Выберите товары и количество ценников
        </div>
      )}
    </div>
  );
}
