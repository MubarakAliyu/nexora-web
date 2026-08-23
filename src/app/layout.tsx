/* eslint-disable @next/next/no-page-custom-font --
   The locked design system requires Cinzel + Montserrat to be loaded via <link>
   tags in the root layout <head> (next/font and CSS @import are disallowed). A root
   layout applies to every route, so the pages-router "single page" caveat behind this
   rule does not apply here. */
import type { Metadata } from "next";
import "@/styles/globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { MockDataHydrator } from "@/components/app/mock-data-hydrator";
import { SITE_URL, SITE_NAME, DEFAULT_OG } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nexora Property Management",
    template: "%s · Nexora Property Management",
  },
  description:
    "Nexora Property Management — managing properties, maximizing value. Premium rental, property, condominium and facility management in Kampala, Uganda.",
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicon_io/apple-touch-icon.png",
  },
  manifest: "/favicon_io/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Apply the persisted theme before paint on dashboard routes only, so a
            hard reload doesn't flash light→dark (marketing stays light-only). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var p=location.pathname;if(!/^\\/(admin|owner|tenant|profile|settings|notifications)(\\/|$)/.test(p))return;var d;var s=localStorage.getItem('nexora-theme');if(s){d=JSON.parse(s).state.theme==='dark';}else{d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
        {/* Design-system fonts — loaded via <link> (NOT CSS @import: Tailwind v4 /
            Lightning CSS cannot resolve remote @import and would fall back to system fonts). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&display=swap"
        />
      </head>
      <body className="antialiased">
        <MockDataHydrator />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
