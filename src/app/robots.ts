import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Allow crawling of marketing pages; keep the authenticated app out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/owner", "/tenant", "/login", "/register", "/2fa", "/reset-password", "/forgot-password", "/verify-email", "/__styleguide"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
