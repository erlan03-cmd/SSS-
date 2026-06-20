import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { updateProductAction } from "@/app/admin/(protected)/products/actions";
import { getCategories, getProductForEdit, getSuppliers } from "@/lib/data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const [product, categories, suppliers] = await Promise.all([
    getProductForEdit(id),
    getCategories(),
    getSuppliers(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ProductForm
        product={product}
        categories={categories}
        suppliers={suppliers}
        action={updateProductAction}
        title="Редактирование товара"
        submitLabel="Сохранить"
      />
    </div>
  );
}
