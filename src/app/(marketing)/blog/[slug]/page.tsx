import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight } from "flowbite-react-icons/outline";
import { Facebook, Twitter, Linkedin, Whatsapp } from "flowbite-react-icons/solid";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { posts, postSlugs, getPost } from "@/content/blog";

export function generateStaticParams() {
  return postSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };
  return { title: post.title, description: post.excerpt };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const shareUrl = `https://nexora.co.ug/blog/${post.slug}`;
  const shareText = encodeURIComponent(post.title);
  const shares = [
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, Icon: Facebook },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, Icon: Twitter },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, Icon: Linkedin },
    { label: "Share on WhatsApp", href: `https://wa.me/?text=${shareText}%20${shareUrl}`, Icon: Whatsapp },
  ];

  return (
    <>
      <PageHero
        eyebrow={post.category}
        title={post.title}
        subtitle={`By ${post.author} · ${formatDate(post.date)} · ${post.readingTime}`}
        image={post.image}
        imageAlt={post.imageAlt}
      />

      <article className="mx-auto max-w-2xl px-6 py-20 md:px-10">
        {post.content.map((para, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <p className="mb-6 text-body leading-relaxed text-foreground">{para}</p>
          </Reveal>
        ))}

        {/* Share */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-8">
          <span className="text-caption font-medium uppercase tracking-wide text-muted">
            Share
          </span>
          {shares.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </article>

      {/* Related posts */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <Reveal>
            <h2 className="font-heading text-h1 font-semibold text-foreground">Related reading</h2>
          </Reveal>
          <RevealGroup
            stagger={0.08}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {related.map((r) => (
              <RevealItem key={r.slug} className="h-full">
                <Link
                  href={`/blog/${r.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={r.image}
                      alt={r.imageAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground">
                      {r.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-h3 font-semibold text-foreground">
                      {r.title}
                    </h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary transition-colors group-hover:text-accent">
                      Read more
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <CtaBanner
        heading="Have a property to manage?"
        subline="Put these ideas to work. Start with a free, no-obligation assessment from Nexora."
        image="/images/properties/tower-poolside.jpg"
        imageAlt="Poolside residential tower"
        primary={{ label: "Request a Free Assessment", href: "/contact" }}
        secondary={{ label: "Back to blog", href: "/blog" }}
      />
    </>
  );
}
