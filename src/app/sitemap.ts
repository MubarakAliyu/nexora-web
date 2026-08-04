import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { services } from "@/content/services";
import { properties as portfolio } from "@/content/portfolio";
import { posts } from "@/content/blog";
import { properties as dbProperties } from "@/lib/mock/db";

/** Public marketing routes for crawlers (app/owner/tenant excluded via robots). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "", "/about", "/services", "/portfolio", "/projects", "/investors",
    "/blog", "/careers", "/contact", "/request-a-quote", "/rentals",
    "/book/cleaning", "/book/lifestyle",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  services.forEach((s) => entries.push({ url: `${SITE_URL}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }));
  portfolio.forEach((p) => entries.push({ url: `${SITE_URL}/portfolio/${p.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }));
  posts.forEach((p) => entries.push({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 }));
  dbProperties
    .filter((p) => p.rentalType && p.status !== "prospect")
    .forEach((p) => entries.push({ url: `${SITE_URL}/rentals/${p.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 }));

  return entries;
}
