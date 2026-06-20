import { ProductForm } from "@/components/product-form";
import { createProductAction } from "@/app/admin/(protected)/products/actions";
import { getCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-4xl">
      <ProductForm
        categories={categories}
        action={createProductAction}
        title="Новый товар"
        submitLabel="Создать товар"
      />
    </div>
  );
}
