"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  decimalFromForm,
  type ActionState,
  recordPurchase,
  recordSale,
  stringFromForm,
} from "@/lib/inventory";

export async function recordSaleAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const productId = stringFromForm(formData, "productId");
    const quantity = decimalFromForm(formData, "quantity", "Количество");
    const note = stringFromForm(formData, "note");

    if (!productId) {
      throw new Error("Выберите товар");
    }

    await recordSale({ productId, quantity, note });
    revalidatePath("/cash");
    revalidatePath("/admin");

    return actionSuccess("Продажа записана");
  } catch (error) {
    return actionError(error);
  }
}

export async function recordPurchaseAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const productId = stringFromForm(formData, "productId");
    const quantity = decimalFromForm(formData, "quantity", "Количество");
    const unitCost = decimalFromForm(formData, "unitCost", "Цена закупки");
    const note = stringFromForm(formData, "note");

    if (!productId) {
      throw new Error("Выберите товар");
    }

    await recordPurchase({ productId, quantity, unitCost, note });
    revalidatePath("/cash");
    revalidatePath("/admin");

    return actionSuccess("Закупка записана");
  } catch (error) {
    return actionError(error);
  }
}
