import bwipjs from "bwip-js/node";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await assertAdmin();
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { barcode: true },
  });
  if (!product?.barcode) {
    return new Response("Штрихкод не найден", { status: 404 });
  }

  try {
    const svg = bwipjs.toSVG({
      bcid: "code128",
      text: product.barcode,
      scale: 2,
      height: 11,
      includetext: true,
      textxalign: "center",
      textsize: 10,
      paddingwidth: 4,
      paddingheight: 2,
    });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="barcode-${id}.svg"`,
      },
    });
  } catch {
    return new Response("Не удалось сформировать штрихкод", { status: 422 });
  }
}
