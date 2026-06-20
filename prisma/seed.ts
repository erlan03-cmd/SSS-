import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Сухие смеси", slug: "suhie-smesi" },
  { name: "Крепеж", slug: "krepezh" },
  { name: "Инструмент", slug: "instrument" },
  { name: "Сантехника", slug: "santehnika" },
  { name: "LED-лампы", slug: "led-lampy" },
  { name: "Лампы E27", slug: "lampy-e27" },
  { name: "Лампы E14", slug: "lampy-e14" },
  { name: "Светильники", slug: "svetilniki" },
  { name: "Плафоны", slug: "plafony" },
  { name: "Патроны", slug: "patrony" },
  { name: "Переходники", slug: "perehodniki" },
  { name: "Розетки", slug: "rozetki" },
  { name: "Выключатели", slug: "vyklyuchateli" },
  { name: "Кабель и провод", slug: "kabel-i-provod" },
  { name: "Автоматы", slug: "avtomaty" },
  { name: "Удлинители", slug: "udliniteli" },
  { name: "Расходные материалы", slug: "elektro-rashodniki" },
];

type SeedProduct = {
  category: string;
  name: string;
  slug: string;
  barcode: string;
  unit: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  recommendedOrderQty?: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  supplier?: string;
  warehouse?: string;
  rack?: string;
  shelf?: string;
  powerW?: string;
  voltageV?: string;
  socketType?: string;
  lightColor?: string;
  colorTemperatureK?: number;
  ipRating?: string;
  color?: string;
  material?: string;
  size?: string;
  cableLengthM?: string;
  wireSectionMm2?: string;
};

const products: SeedProduct[] = [
  {
    category: "suhie-smesi",
    name: "Цемент М-400, 50 кг",
    slug: "cement-m400-50kg",
    barcode: "2000000000010",
    unit: "меш",
    price: "520",
    cost: "430",
    stock: "84",
    minStock: "20",
  },
  {
    category: "suhie-smesi",
    name: "Гипсовая штукатурка, 30 кг",
    slug: "gipsovaya-shtukaturka-30kg",
    barcode: "2000000000027",
    unit: "меш",
    price: "410",
    cost: "335",
    stock: "36",
    minStock: "12",
  },
  {
    category: "suhie-smesi",
    name: "Клей плиточный усиленный, 25 кг",
    slug: "kley-plitochnyy-usilennyy-25kg",
    barcode: "2000000000034",
    unit: "меш",
    price: "360",
    cost: "285",
    stock: "51",
    minStock: "15",
  },
  {
    category: "suhie-smesi",
    name: "Финишная шпаклевка, 20 кг",
    slug: "finishnaya-shpaklevka-20kg",
    barcode: "2000000000041",
    unit: "меш",
    price: "295",
    cost: "232",
    stock: "18",
    minStock: "10",
  },
  {
    category: "suhie-smesi",
    name: "Самовыравнивающийся пол, 25 кг",
    slug: "samovyravnivayushchiysya-pol-25kg",
    barcode: "2000000000058",
    unit: "меш",
    price: "690",
    cost: "560",
    stock: "9",
    minStock: "8",
  },
  {
    category: "krepezh",
    name: "Саморез по дереву 3.5x35",
    slug: "samorez-po-derevu-35x35",
    barcode: "2000000000065",
    unit: "кг",
    price: "190",
    cost: "132",
    stock: "42",
    minStock: "8",
  },
  {
    category: "krepezh",
    name: "Дюбель-гвоздь 6x40",
    slug: "dyubel-gvozd-6x40",
    barcode: "2000000000072",
    unit: "уп",
    price: "145",
    cost: "94",
    stock: "64",
    minStock: "12",
  },
  {
    category: "krepezh",
    name: "Анкерный болт 10x100",
    slug: "ankernyy-bolt-10x100",
    barcode: "2000000000089",
    unit: "шт",
    price: "38",
    cost: "24",
    stock: "230",
    minStock: "50",
  },
  {
    category: "krepezh",
    name: "Уголок монтажный 40x40",
    slug: "ugolok-montazhnyy-40x40",
    barcode: "2000000000096",
    unit: "шт",
    price: "22",
    cost: "14",
    stock: "310",
    minStock: "60",
  },
  {
    category: "krepezh",
    name: "Пена монтажная всесезонная",
    slug: "pena-montazhnaya-vsesezonnaya",
    barcode: "2000000000102",
    unit: "бал",
    price: "330",
    cost: "248",
    stock: "27",
    minStock: "10",
  },
  {
    category: "instrument",
    name: "Рулетка 5 м",
    slug: "ruletka-5m",
    barcode: "2000000000119",
    unit: "шт",
    price: "260",
    cost: "172",
    stock: "23",
    minStock: "6",
  },
  {
    category: "instrument",
    name: "Уровень строительный 60 см",
    slug: "uroven-stroitelnyy-60sm",
    barcode: "2000000000126",
    unit: "шт",
    price: "780",
    cost: "590",
    stock: "14",
    minStock: "4",
  },
  {
    category: "instrument",
    name: "Шпатель фасадный 350 мм",
    slug: "shpatel-fasadnyy-350mm",
    barcode: "2000000000133",
    unit: "шт",
    price: "180",
    cost: "118",
    stock: "39",
    minStock: "10",
  },
  {
    category: "instrument",
    name: "Валик малярный 250 мм",
    slug: "valik-malyarnyy-250mm",
    barcode: "2000000000140",
    unit: "шт",
    price: "210",
    cost: "145",
    stock: "33",
    minStock: "8",
  },
  {
    category: "instrument",
    name: "Диск отрезной по металлу 125 мм",
    slug: "disk-otreznoy-po-metallu-125mm",
    barcode: "2000000000157",
    unit: "шт",
    price: "42",
    cost: "27",
    stock: "180",
    minStock: "40",
  },
  {
    category: "santehnika",
    name: "Труба ППР 20 мм",
    slug: "truba-ppr-20mm",
    barcode: "2000000000164",
    unit: "м",
    price: "55",
    cost: "36",
    stock: "520",
    minStock: "100",
  },
  {
    category: "santehnika",
    name: "Угол ППР 20 мм",
    slug: "ugol-ppr-20mm",
    barcode: "2000000000171",
    unit: "шт",
    price: "18",
    cost: "11",
    stock: "290",
    minStock: "70",
  },
  {
    category: "santehnika",
    name: "Кран шаровый 1/2",
    slug: "kran-sharovyy-12",
    barcode: "2000000000188",
    unit: "шт",
    price: "240",
    cost: "168",
    stock: "34",
    minStock: "8",
  },
  {
    category: "santehnika",
    name: "Лента ФУМ",
    slug: "lenta-fum",
    barcode: "2000000000195",
    unit: "шт",
    price: "38",
    cost: "22",
    stock: "95",
    minStock: "25",
  },
  {
    category: "santehnika",
    name: "Смеситель для кухни",
    slug: "smesitel-dlya-kuhni",
    barcode: "2000000000201",
    unit: "шт",
    price: "1450",
    cost: "1030",
    stock: "7",
    minStock: "3",
  },
  { category: "led-lampy", name: "LED лампа E27 12W 6500K", slug: "led-e27-12w-6500k", barcode: "3000000000019", sku: "LED-E27-12-65", brand: "Эра", subcategory: "Лампы E27", unit: "шт", price: "145", cost: "92", stock: "6", minStock: "20", recommendedOrderQty: "50", supplier: "СветОпт", warehouse: "Основной склад", rack: "A1", shelf: "1", powerW: "12", voltageV: "220–240 V", socketType: "E27", lightColor: "Холодный", colorTemperatureK: 6500, ipRating: "IP20" },
  { category: "led-lampy", name: "LED лампа E27 12W 4000K", slug: "led-e27-12w-4000k", barcode: "3000000000026", sku: "LED-E27-12-40", brand: "Эра", subcategory: "Лампы E27", unit: "шт", price: "145", cost: "92", stock: "38", minStock: "20", recommendedOrderQty: "50", supplier: "СветОпт", warehouse: "Основной склад", rack: "A1", shelf: "1", powerW: "12", voltageV: "220–240 V", socketType: "E27", lightColor: "Нейтральный", colorTemperatureK: 4000, ipRating: "IP20" },
  { category: "lampy-e14", name: "LED свеча E14 7W 3000K", slug: "led-svecha-e14-7w-3000k", barcode: "3000000000033", sku: "LED-E14-7-30", brand: "Gauss", subcategory: "Свеча", unit: "шт", price: "170", cost: "112", stock: "24", minStock: "12", recommendedOrderQty: "30", supplier: "СветОпт", warehouse: "Основной склад", rack: "A1", shelf: "2", powerW: "7", voltageV: "220–240 V", socketType: "E14", lightColor: "Тёплый", colorTemperatureK: 3000, ipRating: "IP20" },
  { category: "svetilniki", name: "Светильник LED накладной 18W 4000K", slug: "svetilnik-led-18w-4000k", barcode: "3000000000040", sku: "SV-N-18-40", brand: "Jazzway", unit: "шт", price: "890", cost: "610", stock: "11", minStock: "5", recommendedOrderQty: "12", supplier: "СветОпт", warehouse: "Витрина", rack: "B1", shelf: "1", powerW: "18", voltageV: "220 V", lightColor: "Нейтральный", colorTemperatureK: 4000, ipRating: "IP20", material: "Металл, пластик", color: "Белый" },
  { category: "svetilniki", name: "Прожектор LED 50W 6500K IP65", slug: "prozhektor-led-50w-ip65", barcode: "3000000000057", sku: "FL-50-65", brand: "IEK", unit: "шт", price: "1350", cost: "940", stock: "8", minStock: "4", recommendedOrderQty: "10", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "B1", shelf: "2", powerW: "50", voltageV: "220 V", lightColor: "Холодный", colorTemperatureK: 6500, ipRating: "IP65", material: "Алюминий" },
  { category: "patrony", name: "Патрон керамический E27", slug: "patron-keramicheskiy-e27", barcode: "3000000000064", sku: "PAT-E27-K", brand: "TDM", unit: "шт", price: "85", cost: "48", stock: "45", minStock: "15", recommendedOrderQty: "40", supplier: "ЭлектроСнаб", warehouse: "Основной склад", rack: "C1", shelf: "1", socketType: "E27", material: "Керамика" },
  { category: "perehodniki", name: "Переходник E27–E14", slug: "perehodnik-e27-e14", barcode: "3000000000071", sku: "ADP-E27-E14", unit: "шт", price: "75", cost: "41", stock: "18", minStock: "8", recommendedOrderQty: "20", supplier: "ЭлектроСнаб", warehouse: "Основной склад", rack: "C1", shelf: "2", socketType: "E27 / E14", material: "Пластик" },
  { category: "rozetki", name: "Розетка двойная с заземлением белая", slug: "rozetka-dvoynaya-zazemlenie", barcode: "3000000000088", sku: "RZ-2-G-W", brand: "Schneider", unit: "шт", price: "360", cost: "245", stock: "28", minStock: "10", recommendedOrderQty: "24", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "D1", shelf: "1", voltageV: "250 V", ipRating: "IP20", color: "Белый", material: "ABS-пластик" },
  { category: "rozetki", name: "Розетка наружная IP44", slug: "rozetka-naruzhnaya-ip44", barcode: "3000000000095", sku: "RZ-OUT-44", brand: "IEK", unit: "шт", price: "290", cost: "185", stock: "13", minStock: "6", recommendedOrderQty: "16", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "D1", shelf: "2", voltageV: "250 V", ipRating: "IP44", color: "Серый" },
  { category: "vyklyuchateli", name: "Выключатель одноклавишный белый", slug: "vyklyuchatel-1-belyy", barcode: "3000000000101", sku: "SW-1-W", brand: "Schneider", unit: "шт", price: "230", cost: "148", stock: "32", minStock: "10", recommendedOrderQty: "24", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "D2", shelf: "1", voltageV: "250 V", ipRating: "IP20", color: "Белый" },
  { category: "kabel-i-provod", name: "Кабель ВВГнг 3×1.5 мм²", slug: "kabel-vvgng-3x15", barcode: "3000000000118", sku: "VVGNG-3X1.5", brand: "ГОСТ", unit: "м", price: "78", cost: "57", stock: "420", minStock: "100", recommendedOrderQty: "300", supplier: "КабельОпт", warehouse: "Основной склад", rack: "K1", shelf: "1", voltageV: "660 V", wireSectionMm2: "1.5", material: "Медь" },
  { category: "kabel-i-provod", name: "Кабель ВВГнг 3×2.5 мм²", slug: "kabel-vvgng-3x25", barcode: "3000000000125", sku: "VVGNG-3X2.5", brand: "ГОСТ", unit: "м", price: "128", cost: "94", stock: "260", minStock: "80", recommendedOrderQty: "200", supplier: "КабельОпт", warehouse: "Основной склад", rack: "K1", shelf: "2", voltageV: "660 V", wireSectionMm2: "2.5", material: "Медь" },
  { category: "kabel-i-provod", name: "Провод ШВВП 2×0.75 мм²", slug: "provod-shvvp-2x075", barcode: "3000000000132", sku: "SHVVP-2X0.75", unit: "м", price: "34", cost: "23", stock: "175", minStock: "50", recommendedOrderQty: "150", supplier: "КабельОпт", warehouse: "Основной склад", rack: "K2", shelf: "1", voltageV: "380 V", wireSectionMm2: "0.75", material: "Медь" },
  { category: "avtomaty", name: "Автоматический выключатель C16 1P", slug: "avtomat-c16-1p", barcode: "3000000000149", sku: "BA47-C16-1P", brand: "IEK", unit: "шт", price: "310", cost: "215", stock: "36", minStock: "12", recommendedOrderQty: "30", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "E1", shelf: "1", voltageV: "230 V", ipRating: "IP20" },
  { category: "avtomaty", name: "Автоматический выключатель C25 2P", slug: "avtomat-c25-2p", barcode: "3000000000156", sku: "BA47-C25-2P", brand: "IEK", unit: "шт", price: "720", cost: "510", stock: "15", minStock: "6", recommendedOrderQty: "15", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "E1", shelf: "2", voltageV: "400 V", ipRating: "IP20" },
  { category: "udliniteli", name: "Удлинитель 3 розетки 5 м", slug: "udlinitel-3-5m", barcode: "3000000000163", sku: "EXT-3-5", brand: "PowerCube", unit: "шт", price: "690", cost: "470", stock: "9", minStock: "5", recommendedOrderQty: "12", supplier: "ЭлектроСнаб", warehouse: "Витрина", rack: "F1", shelf: "1", voltageV: "250 V", cableLengthM: "5", color: "Белый" },
  { category: "plafony", name: "Плафон шар матовый 150 мм", slug: "plafon-shar-150", barcode: "3000000000170", sku: "PL-SH-150", unit: "шт", price: "480", cost: "320", stock: "7", minStock: "4", recommendedOrderQty: "10", supplier: "СветОпт", warehouse: "Витрина", rack: "B2", shelf: "1", color: "Матовый белый", material: "Стекло" },
  { category: "elektro-rashodniki", name: "Изолента ПВХ чёрная 19 мм × 20 м", slug: "izolenta-pvh-19x20", barcode: "3000000000187", sku: "IZO-B-20", brand: "Rexant", unit: "шт", price: "95", cost: "58", stock: "65", minStock: "20", recommendedOrderQty: "50", supplier: "ЭлектроСнаб", warehouse: "Основной склад", rack: "C2", shelf: "1", color: "Чёрный", material: "ПВХ" },
  { category: "elektro-rashodniki", name: "Клемма рычажная 3 провода", slug: "klemma-rychazhnaya-3", barcode: "3000000000194", sku: "KLM-3", brand: "WAGO", unit: "шт", price: "42", cost: "27", stock: "140", minStock: "40", recommendedOrderQty: "100", supplier: "ЭлектроСнаб", warehouse: "Основной склад", rack: "C2", shelf: "2", voltageV: "450 V" },
  { category: "elektro-rashodniki", name: "Гофротруба ПВХ 20 мм", slug: "gofrotruba-pvh-20", barcode: "3000000000200", sku: "GOFRA-20", unit: "м", price: "28", cost: "18", stock: "320", minStock: "100", recommendedOrderQty: "300", supplier: "КабельОпт", warehouse: "Основной склад", rack: "K3", shelf: "1", size: "20 мм", material: "ПВХ" },
];

async function main() {
  const supplierNames = ["СветОпт", "ЭлектроСнаб", "КабельОпт"];
  for (const name of supplierNames) {
    await prisma.supplier.upsert({ where: { name }, update: {}, create: { name } });
  }
  const supplierMap = new Map((await prisma.supplier.findMany({ where: { name: { in: supplierNames } } })).map((supplier) => [supplier.name, supplier.id]));
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  const categoryMap = new Map(
    (
      await prisma.category.findMany({
        where: { slug: { in: categories.map((category) => category.slug) } },
      })
    ).map((category) => [category.slug, category.id]),
  );

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);

    if (!categoryId) {
      throw new Error(`Category ${product.category} was not created`);
    }

    const details = {
      subcategory: product.subcategory ?? null,
      brand: product.brand ?? null,
      sku: product.sku ?? null,
      supplierId: product.supplier ? supplierMap.get(product.supplier) : null,
      warehouse: product.warehouse ?? null,
      rack: product.rack ?? null,
      shelf: product.shelf ?? null,
      powerW: product.powerW ?? null,
      voltageV: product.voltageV ?? null,
      socketType: product.socketType ?? null,
      lightColor: product.lightColor ?? null,
      colorTemperatureK: product.colorTemperatureK ?? null,
      ipRating: product.ipRating ?? null,
      color: product.color ?? null,
      material: product.material ?? null,
      size: product.size ?? null,
      cableLengthM: product.cableLengthM ?? null,
      wireSectionMm2: product.wireSectionMm2 ?? null,
    };
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: product.slug },
          { barcode: product.barcode },
          ...(product.sku ? [{ sku: product.sku }] : []),
        ],
      },
    });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
        name: product.name,
        barcode: product.barcode,
        categoryId,
        ...details,
        },
      });
    } else {
      await prisma.product.create({ data: {
        name: product.name,
        slug: product.slug,
        barcode: product.barcode,
        unit: product.unit,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
        recommendedOrderQty: product.recommendedOrderQty ?? "0",
        categoryId,
        ...details,
      } });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
