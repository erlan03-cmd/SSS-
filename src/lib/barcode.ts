type BarcodeItem = { barcode: string | null };

export function normalizeBarcode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function findByBarcode<T extends BarcodeItem>(
  items: T[],
  rawCode: string,
) {
  const code = normalizeBarcode(rawCode);
  if (!code) return undefined;
  return items.find(
    (item) => item.barcode && normalizeBarcode(item.barcode) === code,
  );
}
