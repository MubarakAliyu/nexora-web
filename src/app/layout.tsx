/* eslint-disable @next/next/no-page-custom-font --
   The locked design system requires Cinzel + Montserrat to be loaded via <link>
   tags in the root layout <head> (next/font and CSS @import are disallowed). A root
   layout applies to every route, so the pages-router "single page" caveat behind this
   rule does not apply here. */
import type { Metadata } from "next";
import "@/styles/globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";

export const metadata: Metadata = {
  title: {
    default: "Nexora Property Management",
    template: "%s · Nexora Property Management",
  },
  description:
    "Nexora Property Management — managing properties, maximizing value. Premium rental, property, condominium and facility management in Kampala, Uganda.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
