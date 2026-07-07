import type { Metadata } from "next";
import { HeroSlider } from "@/components/marketing/hero-slider";
import { HomeStats } from "@/components/marketing/home-stats";
import { HomeAbout } from "@/components/marketing/home-about";
import { HomeServices } from "@/components/marketing/home-services";
import { HomeWhy } from "@/components/marketing/home-why";
import { FeaturedProjects } from "@/components/marketing/featured-projects";
import { Testimonials } from "@/components/marketing/testimonials";
import { HomeCta } from "@/components/marketing/home-cta";

export const metadata: Metadata = {
  description:
    "Nexora Property Management — full-service rental, property, condominium and facility management in Kampala, Uganda. Managing properties, maximizing value.",
};

export default function Home() {
  return (
    <>
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
