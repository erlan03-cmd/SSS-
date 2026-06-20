import type { Category, Product } from "@prisma/client";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toNumber } from "@/lib/format";

type Props = {
  categories: Category[];
  product?: Product;
  action: (formData: FormData) => Promise<void>;
  title: string;
  submitLabel: string;
};

export function ProductForm({
  categories,
  product,
  action,
  title,
  submitLabel,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5">
          {product ? <input type="hidden" name="id" value={product.id} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                name="name"
                defaultValue={product?.name}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={product?.slug}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Категория</Label>
              <Select
                id="categoryId"
                name="categoryId"
                defaultValue={product?.categoryId ?? categories[0]?.id}
                required
                className="h-11"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Штрихкод</Label>
              <Input
                id="barcode"
                name="barcode"
                defaultValue={product?.barcode ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Единица</Label>
              <Input
                id="unit"
                name="unit"
                defaultValue={product?.unit ?? "шт"}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Цена продажи</Label>
              <Input
                id="price"
                name="price"
                inputMode="decimal"
                defaultValue={product ? toNumber(product.price) : ""}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Себестоимость</Label>
              <Input
                id="cost"
                name="cost"
                inputMode="decimal"
                defaultValue={product ? toNumber(product.cost) : "0"}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Остаток</Label>
              <Input
                id="stock"
                name="stock"
                inputMode="decimal"
                defaultValue={product ? toNumber(product.stock) : "0"}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Минимальный остаток</Label>
              <Input
                id="minStock"
                name="minStock"
                inputMode="decimal"
                defaultValue={product ? toNumber(product.minStock) : "0"}
                required
                className="h-11"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="h-11">
              <Save />
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
