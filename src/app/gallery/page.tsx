import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import GalleryGrid from "@/components/events/GalleryGrid";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Gallery", description: "Moments from the stage — past events, battles and showcases." };
export const revalidate = 15;

export default async function GalleryPage() {
  const [events, banners] = await Promise.all([
    safe(publicApi.upcomingEvents({ limit: 30 }), []),
    safe(publicApi.banners(), []),
  ]);

  const shots = [
    ...events.map((e, i) => ({ id: `e-${e._id}`, src: e.image_url, caption: e.title, seed: i })),
    ...banners.map((b, i) => ({ id: `b-${b._id}`, src: b.image_url, caption: b.title, seed: i + 3 })),
  ];

  return (
    <>
      <PageHero title="Gallery" subtitle="Lights, sweat, standing ovations." seed={1} compact />
      <GalleryGrid shots={shots} />
    </>
  );
}
