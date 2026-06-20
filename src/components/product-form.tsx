import type { Category, Product, Supplier } from "@prisma/client";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toNumber } from "@/lib/format";

type Props = {
  categories: Category[];
  suppliers: Supplier[];
  product?: Product;
  action: (formData: FormData) => Promise<void>;
  title: string;
  submitLabel: string;
};

function Field({ label, name, value, type = "text", placeholder }: { label: string; name: string; value?: string | number | null; type?: string; placeholder?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} inputMode={type === "number" ? "decimal" : undefined} defaultValue={value ?? ""} placeholder={placeholder} className="h-11" /></div>;
}

export function ProductForm({ categories, suppliers, product, action, title, submitLabel }: Props) {
  return (
    <form action={action} className="space-y-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="name">Название *</Label><Input id="name" name="name" defaultValue={product?.name} required className="h-11" /></div>
        <Field label="Slug" name="slug" value={product?.slug} />
        <div className="space-y-2"><Label htmlFor="categoryId">Категория *</Label><Select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} required className="h-11">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></div>
        <Field label="Подкатегория" name="subcategory" value={product?.subcategory} placeholder="Например: лампы E27" />
        <Field label="Бренд" name="brand" value={product?.brand} />
        <Field label="Артикул" name="sku" value={product?.sku} />
        <Field label="Штрих‑код" name="barcode" value={product?.barcode} />
        <Field label="Ссылка на фото" name="imageUrl" value={product?.imageUrl} />
        <div className="space-y-2"><Label htmlFor="supplierId">Поставщик</Label><Select id="supplierId" name="supplierId" defaultValue={product?.supplierId ?? ""} className="h-11"><option value="">Не указан</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select></div>
        <div className="space-y-2 md:col-span-2 xl:col-span-3"><Label htmlFor="description">Описание</Label><Textarea id="description" name="description" defaultValue={product?.description ?? ""} /></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Цена, остаток и хранение</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2"><Label htmlFor="unit">Единица *</Label><Select id="unit" name="unit" defaultValue={product?.unit ?? "шт"} className="h-11"><option>шт</option><option>м</option><option>уп</option><option>кор</option><option>бухта</option></Select></div>
        <Field label="Цена продажи *" name="price" type="number" value={product ? toNumber(product.price) : ""} />
        <Field label="Закупочная цена *" name="cost" type="number" value={product ? toNumber(product.cost) : 0} />
        <Field label="Текущий остаток *" name="stock" type="number" value={product ? toNumber(product.stock) : 0} />
        <Field label="Минимальный остаток *" name="minStock" type="number" value={product ? toNumber(product.minStock) : 0} />
        <Field label="Рекомендуемый заказ" name="recommendedOrderQty" type="number" value={product ? toNumber(product.recommendedOrderQty) : 0} />
        <Field label="Склад / зона" name="warehouse" value={product?.warehouse} placeholder="Основной склад" />
        <Field label="Стеллаж" name="rack" value={product?.rack} />
        <Field label="Полка" name="shelf" value={product?.shelf} />
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Характеристики электрики</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Мощность, W" name="powerW" type="number" value={product?.powerW ? toNumber(product.powerW) : ""} />
        <Field label="Напряжение, V" name="voltageV" value={product?.voltageV} placeholder="220–240 V" />
        <Field label="Цоколь" name="socketType" value={product?.socketType} placeholder="E27, E14, GU10" />
        <Field label="Цвет света" name="lightColor" value={product?.lightColor} placeholder="Тёплый / нейтральный" />
        <Field label="Температура, K" name="colorTemperatureK" type="number" value={product?.colorTemperatureK} />
        <Field label="Степень защиты" name="ipRating" value={product?.ipRating} placeholder="IP20, IP44, IP65" />
        <Field label="Размер" name="size" value={product?.size} />
        <Field label="Цвет" name="color" value={product?.color} />
        <Field label="Материал" name="material" value={product?.material} />
        <Field label="Длина кабеля, м" name="cableLengthM" type="number" value={product?.cableLengthM ? toNumber(product.cableLengthM) : ""} />
        <Field label="Сечение, мм²" name="wireSectionMm2" type="number" value={product?.wireSectionMm2 ? toNumber(product.wireSectionMm2) : ""} />
      </CardContent></Card>
      <div className="sticky bottom-3 flex justify-end"><Button className="h-12 px-6 shadow-lg"><Save /> {submitLabel}</Button></div>
    </form>
  );
}
