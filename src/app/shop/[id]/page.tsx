import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import ProductDetail from "@/components/shop/ProductDetail";
import { DEMO_PRODUCTS } from "@/lib/shopDemo";
import { shopApi, safe } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEMO_VARIANTS = [
  { variant_id: "v1", color: "Black", size: "M", stock_quantity: 10 },
  { variant_id: "v2", color: "Black", size: "L", stock_quantity: 8 },
  { variant_id: "v3", color: "Slategray", size: "M", stock_quantity: 5 },
];

async function load(id: string) {
  let product: any = await safe(shopApi.product(id), null);
  const all = await safe(shopApi.products({ limit: 30 }), []);
  if (!product) {
    const demo = DEMO_PRODUCTS.find((d) => d._id === id);
    if (demo) product = { ...demo, description: "Premium heavyweight cotton with an oversized fit — built for the stage and the street.", variants: DEMO_VARIANTS };
  }
  const related = (all.length ? all : DEMO_PRODUCTS).filter((p: any) => (p._id || p.id) !== id).slice(0, 4);
  return { product, related };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { product } = await load(id);
  return { title: product?.name || "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { product, related } = await load(id);

  if (!product) {
    return (
      <>
        <PageHero title="Product" subtitle="This item is no longer available." seed={7} compact />
        <div className="container-x py-24 text-center text-[var(--fg-muted)]">We couldn&apos;t find that product. <a href="/shop" className="font-semibold text-[var(--accent)]">Back to shop</a></div>
      </>
    );
  }

  return <ProductDetail product={product} related={related} />;
}
