import type { Metadata } from "next";
import { HeroSlider } from "@/components/marketing/hero-slider";
import { HomeStats } from "@/components/marketing/home-stats";
import { HomeAbout } from "@/components/marketing/home-about";
import { HomeServices } from "@/components/marketing/home-services";
import { HomeWhy } from "@/components/marketing/home-why";
import { FeaturedProjects } from "@/components/marketing/featured-projects";
import { Testimonials } from "@/components/marketing/testimonials";
import { HomeCta } from "@/components/marketing/home-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { contact } from "@/content/site";

export const metadata: Metadata = {
  description:
    "Nexora Property Management — full-service rental, property, condominium and facility management in Kampala, Uganda. Managing properties, maximizing value.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Nexora Property Management",
    description: "Managing properties, maximizing value — in Kampala, Uganda.",
    url: SITE_URL,
    images: [{ url: "/images/og/nexora-og-home.jpg", width: 1200, height: 630, alt: SITE_NAME }],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo-primary.png`,
  image: `${SITE_URL}/images/og/nexora-og-home.jpg`,
  description: "Full-service property, rental, condominium and facility management in Kampala, Uganda.",
  areaServed: "Uganda",
  address: { "@type": "PostalAddress", addressLocality: "Kampala", addressCountry: "UG" },
  telephone: contact.phone,
  email: contact.email,
  sameAs: ["https://facebook.com", "https://instagram.com", "https://linkedin.com"],
};

export default function Home() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <HeroSlider />
      <HomeStats />
      <HomeAbout />
      <HomeServices />
      <HomeWhy />
      <FeaturedProjects />
      <Testimonials />
      <HomeCta />
    </>
  );
}
