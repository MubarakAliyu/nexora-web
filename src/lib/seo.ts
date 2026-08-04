import type { Metadata } from "next";

/** Canonical production origin — used for metadataBase, canonicals, OG + sitemap. */
export const SITE_URL = "https://nexora.co.ug";
export const SITE_NAME = "Nexora Property Management";
export const DEFAULT_OG = "/images/og/nexora-og-default.jpg";

/**
 * Build a complete, SEO-ready Metadata object for a marketing page — unique
 * title + description, canonical URL, Open Graph + Twitter card. Titles inherit
 * the root `%s · Nexora Property Management` template.
 */
export function pageMeta(opts: {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
}): Metadata {
  const { title, description, path = "/", ogImage = DEFAULT_OG } = opts;
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
