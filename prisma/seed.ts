import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Сухие смеси", slug: "suhie-smesi" },
  { name: "Крепеж", slug: "krepezh" },
  { name: "Инструмент", slug: "instrument" },
  { name: "Сантехника", slug: "santehnika" },
];

const products = [
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
];

async function main() {
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

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        barcode: product.barcode,
        unit: product.unit,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
        categoryId,
      },
      create: {
        name: product.name,
        slug: product.slug,
        barcode: product.barcode,
        unit: product.unit,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
        categoryId,
      },
    });
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
