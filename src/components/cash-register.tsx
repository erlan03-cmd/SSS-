"use client";

import { PaymentMethod } from "@prisma/client";
import {
  Barcode,
  Boxes,
  Camera,
  CheckCircle2,
  Minus,
  Plus,
  Clock3,
  LogOut,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { checkoutAction, deleteHeldReceiptAction, holdReceiptAction, requestReturnAction } from "@/app/cash/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CashProduct } from "@/lib/data";
import { formatMoney, formatQuantity } from "@/lib/format";
import { initialActionState } from "@/lib/inventory";
import { cn } from "@/lib/utils";

type CartItem = { productId: string; quantity: number };
type HeldReceipt = {
  id: string;
  name: string;
  items: CartItem[];
  discountPercent: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
};

type Props = {
  products: CashProduct[];
  employee: { name: string; maxDiscountPercent: number };
  heldReceipts: HeldReceipt[];
};

type Tab = "sale" | "products" | "cart" | "held" | "profile";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Наличные",
  CARD: "Карта",
  QR: "QR-оплата",
  TRANSFER: "Перевод",
};

const stockClasses = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low: "bg-amber-50 text-amber-700 border-amber-200",
  out: "bg-rose-50 text-rose-700 border-rose-200",
};

function CheckoutButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} className="h-14 w-full text-base shadow-lg">
      <CheckCircle2 /> {pending ? "Оформляем..." : "Оформить продажу"}
    </Button>
  );
}

function CameraScanner({
  products,
  onFound,
  onClose,
}: {
  products: CashProduct[];
  onFound: (product: CashProduct) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Наведи камеру на штрих‑код");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let active = true;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        if (!Detector) {
          setMessage("Автосканер не поддерживается — введи код вручную");
          return;
        }
        const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "qr_code"] });
        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const code = codes[0]?.rawValue;
            if (code) {
              const product = products.find((item) => item.barcode === code);
              if (product) {
                onFound(product);
                return;
              }
              setMessage(`Код ${code} не найден`);
            }
          } catch {}
          timer = window.setTimeout(scan, 250);
        };
        void scan();
      } catch {
        setMessage("Нет доступа к камере. Разреши камеру или введи код вручную.");
      }
    }
    void start();
    return () => {
      active = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onFound, products]);

  function submitManual() {
    const product = products.find((item) => item.barcode === manual.trim());
    if (product) onFound(product);
    else setMessage("Товар с таким штрих‑кодом не найден");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between p-4">
        <div><p className="font-semibold">Сканирование</p><p className="text-sm text-slate-300">{message}</p></div>
        <Button type="button" variant="outline" size="icon" onClick={onClose} className="border-white/20 bg-white/10 text-white"><X /></Button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-amber-400 shadow-[0_0_0_999px_rgba(0,0,0,.45)]" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 p-4">
        <Input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Ввести штрих‑код" className="h-12 bg-white text-slate-950" />
        <Button type="button" onClick={submitManual} className="h-12">Найти</Button>
      </div>
    </div>
  );
}

export function CashRegister({ products, employee, heldReceipts }: Props) {
  const [tab, setTab] = useState<Tab>("sale");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [state, formAction] = useActionState(checkoutAction, initialActionState);
  const [isPending, startTransition] = useTransition();
  const normalized = query.trim().toLowerCase();
  const categories = useMemo(() => [...new Map(products.map((product) => [product.categorySlug, product.categoryName])).entries()], [products]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const categoryMatches = category === "all" || product.categorySlug === category;
    const haystack = [product.name, product.barcode, product.sku, product.brand, product.categoryName, product.subcategory, ...product.specifications].filter(Boolean).join(" ").toLowerCase();
    return categoryMatches && (!normalized || haystack.includes(normalized));
  }), [category, normalized, products]);

  const detailedCart = cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId)! })).filter((item) => item.product);
  const subtotal = detailedCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountNumber = Math.min(Math.max(Number(discount) || 0, 0), employee.maxDiscountPercent);
  const total = subtotal * (1 - discountNumber / 100);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (state.ok && state.receipt) {
      setCart([]);
      setDiscount("0");
      setTab("sale");
    }
  }, [state.ok, state.receipt, state.version]);

  function addProduct(product: CashProduct) {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...current, { productId: product.id, quantity: 1 }];
    });
  }

  function changeQuantity(product: CashProduct, quantity: number) {
    if (quantity <= 0) setCart((current) => current.filter((item) => item.productId !== product.id));
    else setCart((current) => current.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(quantity, product.stock) } : item));
  }

  function holdCurrent() {
    startTransition(async () => {
      await holdReceiptAction({ name: "", items: cart, discountPercent: discountNumber, paymentMethod });
      setCart([]);
      setDiscount("0");
      window.location.reload();
    });
  }

  const productGrid = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {visibleProducts.map((product) => (
        <button key={product.id} type="button" onClick={() => addProduct(product)} disabled={product.stock <= 0} className="group min-h-40 rounded-2xl border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:opacity-50">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><PackageSearch className="size-6" /></div>
            <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold", stockClasses[product.stockStatus])}>{formatQuantity(product.stock, product.unit)}</span>
          </div>
          <p className="line-clamp-2 font-semibold leading-snug">{product.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{product.brand || product.categoryName}{product.sku ? ` · ${product.sku}` : ""}</p>
          <div className="mt-3 flex items-end justify-between gap-2"><span className="text-base font-bold text-primary">{formatMoney(product.price)}</span><Plus className="size-5 text-muted-foreground group-hover:text-primary" /></div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="pb-24 md:pb-4">
      {scannerOpen ? <CameraScanner products={products} onClose={() => setScannerOpen(false)} onFound={(product) => { addProduct(product); setScannerOpen(false); setTab("cart"); }} /> : null}

      {state.receipt ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-6" /><div><p className="font-bold">Продажа оформлена</p><p className="text-sm">{state.receipt.receiptNumber} · {formatMoney(state.receipt.total)} · {state.receipt.sellerName}</p></div></div>
        </div>
      ) : state.message ? <p className={cn("mb-4 rounded-xl px-4 py-3 text-sm", state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700")}>{state.message}</p> : null}

      {(tab === "sale" || tab === "products") ? (
        <div className="space-y-4">
          <div className="sticky top-0 z-20 space-y-3 bg-background/95 pb-2 pt-1 backdrop-blur">
            <Button type="button" onClick={() => setScannerOpen(true)} className="h-16 w-full rounded-2xl bg-slate-900 text-lg shadow-lg hover:bg-slate-800"><Camera className="size-6" /> Сканировать штрих‑код</Button>
            <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, артикул, бренд, характеристика" className="h-14 rounded-2xl bg-card pl-12 text-base" /></div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button type="button" size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")} className="shrink-0">Все</Button>
              {categories.map(([slug, name]) => <Button key={slug} type="button" size="sm" variant={category === slug ? "default" : "outline"} onClick={() => setCategory(slug)} className="shrink-0">{name}</Button>)}
            </div>
          </div>
          {productGrid}
        </div>
      ) : null}

      {tab === "cart" ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <div><h2 className="text-2xl font-bold">Корзина</h2><p className="text-sm text-muted-foreground">{itemCount} товаров</p></div>
          {detailedCart.length ? detailedCart.map(({ product, quantity }) => (
            <Card key={product.id}><CardContent className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{product.name}</p><p className="text-sm text-muted-foreground">{formatMoney(product.price)} / {product.unit}</p></div><div className="flex items-center gap-1 rounded-xl border p-1"><Button type="button" size="icon" variant="ghost" onClick={() => changeQuantity(product, quantity - 1)}><Minus /></Button><span className="w-9 text-center font-bold">{quantity}</span><Button type="button" size="icon" variant="ghost" onClick={() => changeQuantity(product, quantity + 1)}><Plus /></Button></div><p className="w-24 text-right font-bold">{formatMoney(product.price * quantity)}</p></CardContent></Card>
          )) : <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground"><ShoppingCart className="mx-auto mb-3 size-10" />Корзина пуста</div>}

          <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
            <input type="hidden" name="items" value={JSON.stringify(cart)} />
            <div><Label>Способ оплаты</Label><div className="mt-2 grid grid-cols-2 gap-2">{Object.values(PaymentMethod).map((method) => <Button key={method} type="button" variant={paymentMethod === method ? "default" : "outline"} onClick={() => setPaymentMethod(method)}>{paymentLabels[method]}</Button>)}</div><input type="hidden" name="paymentMethod" value={paymentMethod} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="discount">Скидка, % (до {employee.maxDiscountPercent}%)</Label><Input id="discount" name="discountPercent" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} className="mt-2 h-12" /></div><div><Label htmlFor="note">Комментарий</Label><Input id="note" name="note" placeholder="Необязательно" className="mt-2 h-12" /></div></div>
            <div className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Подытог</span><span>{formatMoney(subtotal)}</span></div><div className="flex justify-between text-muted-foreground"><span>Скидка {discountNumber}%</span><span>− {formatMoney(subtotal - total)}</span></div><div className="flex justify-between text-xl font-bold"><span>Итого</span><span>{formatMoney(total)}</span></div></div>
            <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={!cart.length || isPending} onClick={holdCurrent} className="h-12"><Clock3 /> Отложить</Button><Button type="button" variant="ghost" disabled={!cart.length} onClick={() => setCart([])} className="h-12 text-destructive"><X /> Очистить</Button></div>
            <CheckoutButton disabled={!cart.length} />
          </form>
        </div>
      ) : null}

      {tab === "held" ? (
        <div className="mx-auto max-w-3xl space-y-4"><div><h2 className="text-2xl font-bold">Отложенные чеки</h2><p className="text-sm text-muted-foreground">Можно вернуть чек в корзину</p></div>{heldReceipts.length ? heldReceipts.map((receipt) => <Card key={receipt.id}><CardContent className="flex items-center gap-3 p-4"><Clock3 className="size-6 text-amber-600" /><div className="min-w-0 flex-1"><p className="font-semibold">{receipt.name}</p><p className="text-sm text-muted-foreground">{receipt.items.length} позиций · {new Date(receipt.createdAt).toLocaleString("ru-RU")}</p></div><Button type="button" onClick={() => { setCart(receipt.items); setDiscount(String(receipt.discountPercent)); setPaymentMethod(receipt.paymentMethod); startTransition(async () => { await deleteHeldReceiptAction(receipt.id); }); setTab("cart"); }}>Вернуть</Button></CardContent></Card>) : <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Отложенных чеков нет</div>}</div>
      ) : null}

      {tab === "profile" ? (
        <div className="mx-auto max-w-xl space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound /> {employee.name}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Максимальная скидка: {employee.maxDiscountPercent}%</p><Button asChild variant="outline" className="w-full"><Link href="/cash/logout"><LogOut /> Выйти</Link></Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw /> Запросить возврат</CardTitle></CardHeader><CardContent><form action={requestReturnAction} className="space-y-3"><Input name="receiptNumber" placeholder="Номер чека" required /><Textarea name="reason" placeholder="Причина возврата" required /><Button variant="outline" className="w-full">Отправить администратору</Button></form></CardContent></Card></div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur md:sticky md:bottom-3 md:mx-auto md:mt-8 md:max-w-3xl md:rounded-2xl md:border">
        <div className="grid grid-cols-5 gap-1">
          {([
            ["sale", "Продажа", Barcode],
            ["products", "Товары", Boxes],
            ["cart", `Корзина${itemCount ? ` ${itemCount}` : ""}`, ShoppingCart],
            ["held", "Отложено", ReceiptText],
            ["profile", "Профиль", UserRound],
          ] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setTab(value)} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium", tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><Icon className="size-5" /><span className="truncate">{label}</span></button>)}
        </div>
      </nav>
    </div>
  );
}
