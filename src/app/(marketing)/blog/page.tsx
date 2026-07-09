import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { BlogGrid } from "@/components/marketing/blog-grid";
import { blogHero } from "@/content/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical guidance on property management, investment and ownership from the Nexora team.",
};

export default function BlogPage() {
  return (
    <>
      <PageHero {...blogHero} />
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <BlogGrid />
      </section>
    </>
  );
}
