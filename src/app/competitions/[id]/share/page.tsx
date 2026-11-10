import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { publicApi, safe } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id } = await params;
  let comp = await safe(publicApi.competition(id), null);
  if (!comp) {
    const all = await safe(publicApi.competitions({ limit: 200 }), []);
    comp = all.find((c: any) => (c._id || c.id) === id);
  }

  const title = comp?.title || comp?.name || "Official Talent Competition";
  const descRaw =
    comp?.description ||
    "Join this official talent competition on Upgrade Talents India! Register now, showcase your talent on stage, and win exciting prizes.";
  const description = descRaw
    .replace(/[━─—_\-=*#✨🏆💎💰🔥\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://upgradetalentsindia.in";
  const canonicalUrl = `${siteUrl.replace(/\/$/, "")}/competitions/${id}`;
  const shareUrl = `${siteUrl.replace(/\/$/, "")}/competitions/${id}/share`;

  const rawImage =
    comp?.share_image_url ||
    comp?.banner_image_url ||
    comp?.card_image_url ||
    comp?.image_url;

  let imageUrl = rawImage;
  if (!imageUrl) {
    imageUrl = `${siteUrl.replace(/\/$/, "")}/assets/og-poster-fallback.jpg`;
  } else if (imageUrl.startsWith("/")) {
    imageUrl = `${siteUrl.replace(/\/$/, "")}${imageUrl}`;
  }

  return {
    title: `${title} | Upgrade Talents India`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} — Official Talent Competition`,
      description,
      url: shareUrl,
      siteName: "Upgrade Talents India",
      locale: "en_IN",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Upgrade Talents India`,
      description,
      images: [imageUrl],
      creator: "@UpgradeTalents",
    },
  };
}

export default async function CompetitionShareLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const action = typeof sp?.action === "string" ? sp.action : undefined;

  // Real users visiting this share landing page will be instantly forwarded to the main competition page
  const targetUrl = action === "register" ? `/competitions/${id}?action=register#register` : `/competitions/${id}`;
  redirect(targetUrl);
}

