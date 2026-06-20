"use client";

import { PaymentMethod } from "@prisma/client";
import type { IScannerControls } from "@zxing/browser";
import {
  Barcode,
  Banknote,
  Boxes,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Flashlight,
  FlashlightOff,
  Minus,
  Plus,
  Printer,
  Clock3,
  LogOut,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  Search,
  Share2,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import {
  cashMovementAction,
  checkoutAction,
  closeShiftAction,
  deleteHeldReceiptAction,
  holdReceiptAction,
  requestReturnAction,
} from "@/app/cash/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { findByBarcode } from "@/lib/barcode";
import type { CashShiftSummary } from "@/lib/cash-shift";
import type { CashProduct } from "@/lib/data";
import { formatMoney, formatQuantity } from "@/lib/format";
import { initialActionState, type SaleReceipt } from "@/lib/inventory";
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
  shift: CashShiftSummary;
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

function receiptPaymentLabel(receipt: SaleReceipt) {
  return receipt.payments
    .map(
      (payment) =>
        `${paymentLabels[payment.method]}: ${payment.amount.toFixed(2)} сом`,
    )
    .join(" + ");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function printReceipt(receipt: SaleReceipt) {
  const popup = window.open("", "_blank", "width=420,height=720");
  if (!popup) return;
  const rows = receipt.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}<br><small>${item.quantity} × ${item.unitPrice.toFixed(2)}</small></td><td>${item.total.toFixed(2)}</td></tr>`,
    )
    .join("");
  popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(receipt.receiptNumber)}</title><style>body{font:14px Arial,sans-serif;width:72mm;margin:0 auto;padding:8mm 2mm;color:#111}h1{text-align:center;font-size:20px;margin:0}p{text-align:center;margin:5px 0}table{width:100%;border-collapse:collapse;margin:14px 0}td{padding:7px 0;border-bottom:1px dashed #aaa;vertical-align:top}td:last-child{text-align:right;font-weight:700}.total{font-size:20px;font-weight:700;display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:10px}.muted{color:#555;font-size:12px}@media print{body{padding:0}}</style></head><body><h1>SSS+</h1><p>Товарный чек</p><p class="muted">${escapeHtml(receipt.receiptNumber)}<br>${new Date(receipt.createdAt).toLocaleString("ru-RU")}<br>Кассир: ${escapeHtml(receipt.sellerName)}</p><table>${rows}</table><div class="total"><span>ИТОГО</span><span>${receipt.total.toFixed(2)} сом</span></div><p class="muted">Оплата: ${escapeHtml(receiptPaymentLabel(receipt))}</p><p>Спасибо за покупку!</p><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
  popup.document.close();
}

async function shareReceipt(receipt: SaleReceipt) {
  const lines = [
    "SSS+ — товарный чек",
    receipt.receiptNumber,
    ...receipt.items.map(
      (item) =>
        `${item.name}: ${item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)} сом`,
    ),
    `Итого: ${receipt.total.toFixed(2)} сом`,
    `Оплата: ${receiptPaymentLabel(receipt)}`,
    `Кассир: ${receipt.sellerName}`,
  ];
  const text = lines.join("\n");
  if (navigator.share) {
    try {
      await navigator.share({ title: receipt.receiptNumber, text });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function CheckoutButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      disabled={disabled || pending}
      className="h-14 w-full text-base shadow-lg"
    >
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
  const controlsRef = useRef<IScannerControls | null>(null);
  const completedRef = useRef(false);
  const lastUnknownRef = useRef("");
  const [message, setMessage] = useState("Запускаем распознавание…");
  const [manual, setManual] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const successFeedback = useCallback(() => {
    navigator.vibrate?.(120);
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch {
      // Вибрация уже дала обратную связь, звук может быть запрещён браузером.
    }
  }, []);

  const handleCode = useCallback(
    (rawCode: string) => {
      if (completedRef.current) return true;
      const code = rawCode.trim();
      if (!code) return false;

      const product = findByBarcode(products, code);
      if (!product) {
        if (lastUnknownRef.current !== code) {
          lastUnknownRef.current = code;
          setMessage(`Штрих‑код ${code} считан, но товара с таким кодом нет`);
          navigator.vibrate?.([50, 50, 50]);
        }
        return false;
      }

      completedRef.current = true;
      setMessage(`Найдено: ${product.name}`);
      successFeedback();
      controlsRef.current?.stop();
      window.setTimeout(() => onFound(product), 220);
      return true;
    },
    [onFound, products, successFeedback],
  );

  useEffect(() => {
    let active = true;
    completedRef.current = false;
    lastUnknownRef.current = "";

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setMessage(
            "Этот браузер не поддерживает камеру. Введите штрих‑код вручную.",
          );
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active || !videoRef.current) return;

        const reader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 120,
          delayBetweenScanSuccess: 500,
        });
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, _error, scannerControls) => {
            if (!active || !result) return;
            if (handleCode(result.getText())) scannerControls.stop();
          },
        );

        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setTorchAvailable(Boolean(controls.switchTorch));
        setMessage("Наведите камеру на штрих‑код и держите телефон неподвижно");
      } catch {
        setMessage(
          "Не удалось запустить сканер. Разрешите доступ к камере или введите код вручную.",
        );
      }
    }

    void start();
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [handleCode]);

  async function toggleTorch() {
    const next = !torchOn;
    try {
      await controlsRef.current?.switchTorch?.(next);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
      setMessage("Фонарик на этом телефоне недоступен");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between p-4">
        <div className="pr-3">
          <p className="font-semibold">Сканирование штрих‑кода</p>
          <p className="text-sm text-slate-300">{message}</p>
        </div>
        <div className="flex gap-2">
          {torchAvailable ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTorch}
              className="border-white/20 bg-white/10 text-white"
              aria-label={torchOn ? "Выключить фонарик" : "Включить фонарик"}
            >
              {torchOn ? <FlashlightOff /> : <Flashlight />}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            className="border-white/20 bg-white/10 text-white"
            aria-label="Закрыть сканер"
          >
            <X />
          </Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-52 -translate-y-1/2 rounded-3xl border-2 border-amber-400 shadow-[0_0_0_999px_rgba(0,0,0,.48)]">
          <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,.9)]" />
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-xs text-white/80">
          Расстояние 15–25 см · код должен целиком попадать в рамку
        </p>
      </div>
      <form
        className="grid grid-cols-[1fr_auto] gap-2 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleCode(manual);
        }}
      >
        <Input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Или введите штрих‑код"
          className="h-12 bg-white text-slate-950"
        />
        <Button className="h-12">Найти</Button>
      </form>
    </div>
  );
}

export function CashRegister({ products, employee, heldReceipts, shift }: Props) {
  const [tab, setTab] = useState<Tab>("sale");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH,
  );
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashPart, setCashPart] = useState("0");
  const [remainderMethod, setRemainderMethod] = useState<PaymentMethod>(
    PaymentMethod.CARD,
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [state, formAction] = useActionState(
    checkoutAction,
    initialActionState,
  );
  const [isPending, startTransition] = useTransition();
  const normalized = query.trim().toLowerCase();
  const categories = useMemo(
    () => [
      ...new Map(
        products.map((product) => [product.categorySlug, product.categoryName]),
      ).entries(),
    ],
    [products],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatches =
          category === "all" || product.categorySlug === category;
        const haystack = [
          product.name,
          product.barcode,
          product.sku,
          product.brand,
          product.categoryName,
          product.subcategory,
          ...product.specifications,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          categoryMatches && (!normalized || haystack.includes(normalized))
        );
      }),
    [category, normalized, products],
  );

  const detailedCart = cart
    .map((item) => ({
      ...item,
      product: products.find((product) => product.id === item.productId)!,
    }))
    .filter((item) => item.product);
  const subtotal = detailedCart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const discountNumber = Math.min(
    Math.max(Number(discount) || 0, 0),
    employee.maxDiscountPercent,
  );
  const total = subtotal * (1 - discountNumber / 100);
  const roundedTotal = Number(total.toFixed(2));
  const splitCash = Math.min(
    Math.max(Number(String(cashPart).replace(",", ".")) || 0, 0),
    roundedTotal,
  );
  const splitRemainder = Number((roundedTotal - splitCash).toFixed(2));
  const checkoutPayments = splitPayment
    ? [
        ...(splitCash > 0
          ? [{ method: PaymentMethod.CASH, amount: Number(splitCash.toFixed(2)) }]
          : []),
        ...(splitRemainder > 0
          ? [{ method: remainderMethod, amount: splitRemainder }]
          : []),
      ]
    : [];
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (state.ok && state.receipt) {
      setCart([]);
      setDiscount("0");
      setSplitPayment(false);
      setCashPart("0");
      setTab("sale");
    }
  }, [state.ok, state.receipt, state.version]);

  function addProduct(product: CashProduct) {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing)
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      return [...current, { productId: product.id, quantity: 1 }];
    });
  }

  function changeQuantity(product: CashProduct, quantity: number) {
    if (quantity <= 0)
      setCart((current) =>
        current.filter((item) => item.productId !== product.id),
      );
    else
      setCart((current) =>
        current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(quantity, product.stock) }
            : item,
        ),
      );
  }

  function holdCurrent() {
    startTransition(async () => {
      await holdReceiptAction({
        name: "",
        items: cart,
        discountPercent: discountNumber,
        paymentMethod,
      });
      setCart([]);
      setDiscount("0");
      window.location.reload();
    });
  }

  const productGrid = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {visibleProducts.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => addProduct(product)}
          disabled={product.stock <= 0}
          className="group min-h-40 rounded-2xl border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:opacity-50"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <PackageSearch className="size-6" />
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-[11px] font-semibold",
                stockClasses[product.stockStatus],
              )}
            >
              {formatQuantity(product.stock, product.unit)}
            </span>
          </div>
          <p className="line-clamp-2 font-semibold leading-snug">
            {product.name}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {product.brand || product.categoryName}
            {product.sku ? ` · ${product.sku}` : ""}
          </p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-base font-bold text-primary">
              {formatMoney(product.price)}
            </span>
            <Plus className="size-5 text-muted-foreground group-hover:text-primary" />
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="pb-24 md:pb-4">
      {scannerOpen ? (
        <CameraScanner
          products={products}
          onClose={() => setScannerOpen(false)}
          onFound={(product) => {
            addProduct(product);
            setScannerOpen(false);
            setTab("cart");
          }}
        />
      ) : null}

      {state.receipt ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Продажа оформлена</p>
              <p className="text-sm">
                {state.receipt.receiptNumber} ·{" "}
                {formatMoney(state.receipt.total)} · {state.receipt.sellerName}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => printReceipt(state.receipt!)}
                >
                  <Printer /> Печать чека
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void shareReceipt(state.receipt!)}
                >
                  <Share2 /> Поделиться
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : state.message ? (
        <p
          className={cn(
            "mb-4 rounded-xl px-4 py-3 text-sm",
            state.ok
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-700",
          )}
        >
          {state.message}
        </p>
      ) : null}

      {tab === "sale" || tab === "products" ? (
        <div className="space-y-4">
          <div className="sticky top-0 z-20 space-y-3 bg-background/95 pb-2 pt-1 backdrop-blur">
            <Button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg shadow-lg hover:bg-slate-800"
            >
              <Camera className="size-6" /> Сканировать штрих‑код
            </Button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Название, артикул, бренд, характеристика"
                className="h-14 rounded-2xl bg-card pl-12 text-base"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                type="button"
                size="sm"
                variant={category === "all" ? "default" : "outline"}
                onClick={() => setCategory("all")}
                className="shrink-0"
              >
                Все
              </Button>
              {categories.map(([slug, name]) => (
                <Button
                  key={slug}
                  type="button"
                  size="sm"
                  variant={category === slug ? "default" : "outline"}
                  onClick={() => setCategory(slug)}
                  className="shrink-0"
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
          {productGrid}
        </div>
      ) : null}

      {tab === "cart" ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Корзина</h2>
            <p className="text-sm text-muted-foreground">{itemCount} товаров</p>
          </div>
          {detailedCart.length ? (
            detailedCart.map(({ product, quantity }) => (
              <Card key={product.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(product.price)} / {product.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => changeQuantity(product, quantity - 1)}
                    >
                      <Minus />
                    </Button>
                    <span className="w-9 text-center font-bold">
                      {quantity}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => changeQuantity(product, quantity + 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                  <p className="w-24 text-right font-bold">
                    {formatMoney(product.price * quantity)}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto mb-3 size-10" />
              Корзина пуста
            </div>
          )}

          <form
            action={formAction}
            className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm"
          >
            <input type="hidden" name="items" value={JSON.stringify(cart)} />
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label>Способ оплаты</Label>
                <Button
                  type="button"
                  size="sm"
                  variant={splitPayment ? "default" : "outline"}
                  onClick={() => {
                    setSplitPayment((current) => !current);
                    setCashPart((roundedTotal / 2).toFixed(2));
                  }}
                >
                  Разделить оплату
                </Button>
              </div>
              {!splitPayment ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.values(PaymentMethod).map((method) => (
                    <Button
                      key={method}
                      type="button"
                      variant={paymentMethod === method ? "default" : "outline"}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {paymentLabels[method]}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-3 rounded-xl border bg-muted/40 p-3">
                  <div>
                    <Label htmlFor="cashPart">Наличными, сом</Label>
                    <Input
                      id="cashPart"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={roundedTotal}
                      step="0.01"
                      value={cashPart}
                      onChange={(event) => setCashPart(event.target.value)}
                      className="mt-1 h-12"
                    />
                  </div>
                  <div>
                    <Label>Остаток {formatMoney(splitRemainder)} оплатить</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {([PaymentMethod.CARD, PaymentMethod.QR, PaymentMethod.TRANSFER] as const).map(
                        (method) => (
                          <Button
                            key={method}
                            type="button"
                            size="sm"
                            variant={remainderMethod === method ? "default" : "outline"}
                            onClick={() => setRemainderMethod(method)}
                          >
                            {paymentLabels[method]}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
              <input
                type="hidden"
                name="payments"
                value={JSON.stringify(checkoutPayments)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="discount">
                  Скидка, % (до {employee.maxDiscountPercent}%)
                </Label>
                <Input
                  id="discount"
                  name="discountPercent"
                  inputMode="decimal"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="mt-2 h-12"
                />
              </div>
              <div>
                <Label htmlFor="note">Комментарий</Label>
                <Input
                  id="note"
                  name="note"
                  placeholder="Необязательно"
                  className="mt-2 h-12"
                />
              </div>
            </div>
            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>Подытог</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Скидка {discountNumber}%</span>
                <span>− {formatMoney(subtotal - total)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>Итого</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!cart.length || isPending}
                onClick={holdCurrent}
                className="h-12"
              >
                <Clock3 /> Отложить
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!cart.length}
                onClick={() => setCart([])}
                className="h-12 text-destructive"
              >
                <X /> Очистить
              </Button>
            </div>
            <CheckoutButton disabled={!cart.length} />
          </form>
        </div>
      ) : null}

      {tab === "held" ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Отложенные чеки</h2>
            <p className="text-sm text-muted-foreground">
              Можно вернуть чек в корзину
            </p>
          </div>
          {heldReceipts.length ? (
            heldReceipts.map((receipt) => (
              <Card key={receipt.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Clock3 className="size-6 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{receipt.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {receipt.items.length} позиций ·{" "}
                      {new Date(receipt.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setCart(receipt.items);
                      setDiscount(String(receipt.discountPercent));
                      setPaymentMethod(receipt.paymentMethod);
                      startTransition(async () => {
                        await deleteHeldReceiptAction(receipt.id);
                      });
                      setTab("cart");
                    }}
                  >
                    Вернуть
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              Отложенных чеков нет
            </div>
          )}
        </div>
      ) : null}

      {tab === "profile" ? (
        <div className="mx-auto max-w-xl space-y-4">
          <Card className="border-emerald-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign /> Открытая смена
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                С {new Date(shift.openedAt).toLocaleString("ru-RU")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Продаж</p>
                  <p className="text-lg font-bold">{shift.saleCount}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Всего</p>
                  <p className="text-lg font-bold">{formatMoney(shift.totalSales)}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Размен</p>
                  <p className="font-semibold">{formatMoney(shift.openingCash)}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Наличные продажи</p>
                  <p className="font-semibold">{formatMoney(shift.cashSales)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
                  <p className="text-emerald-700">Внесено</p>
                  <p className="font-semibold">+ {formatMoney(shift.cashIn)}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3 text-rose-900">
                  <p className="text-rose-700">Изъято и расходы</p>
                  <p className="font-semibold">
                    − {formatMoney(shift.cashOut + shift.expenses)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm text-emerald-800">Ожидается наличных в кассе</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatMoney(shift.expectedCash)}
                </p>
              </div>
              <form action={cashMovementAction} className="space-y-3 rounded-xl border p-3">
                <p className="flex items-center gap-2 font-semibold">
                  <Banknote className="size-5" /> Операция с наличными
                </p>
                <select
                  name="type"
                  required
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="EXPENSE"
                >
                  <option value="EXPENSE">Расход из кассы</option>
                  <option value="CASH_IN">Внести деньги</option>
                  <option value="CASH_OUT">Изъять деньги</option>
                </select>
                <Input
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="Сумма, сом"
                  required
                />
                <Input name="note" placeholder="Причина операции" required />
                <Button variant="outline" className="w-full">
                  Записать операцию
                </Button>
              </form>
              <form action={closeShiftAction} className="space-y-3 border-t pt-4">
                <div>
                  <Label htmlFor="closingCash">Фактически пересчитано, сом</Label>
                  <Input
                    id="closingCash"
                    name="closingCash"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    defaultValue={shift.expectedCash.toFixed(2)}
                    required
                    className="mt-2 h-12"
                  />
                </div>
                <Textarea name="note" placeholder="Комментарий к расхождению (необязательно)" />
                <Button variant="destructive" className="h-12 w-full">
                  Закрыть смену
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound /> {employee.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Максимальная скидка: {employee.maxDiscountPercent}%
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/cash/logout">
                  <LogOut /> Выйти
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw /> Запросить возврат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={requestReturnAction} className="space-y-3">
                <Input name="receiptNumber" placeholder="Номер чека" required />
                <Textarea
                  name="reason"
                  placeholder="Причина возврата"
                  required
                />
                <Button variant="outline" className="w-full">
                  Отправить администратору
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur md:sticky md:bottom-3 md:mx-auto md:mt-8 md:max-w-3xl md:rounded-2xl md:border">
        <div className="grid grid-cols-5 gap-1">
          {(
            [
              ["sale", "Продажа", Barcode],
              ["products", "Товары", Boxes],
              [
                "cart",
                `Корзина${itemCount ? ` ${itemCount}` : ""}`,
                ShoppingCart,
              ],
              ["held", "Отложено", ReceiptText],
              ["profile", "Профиль", UserRound],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium",
                tab === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
