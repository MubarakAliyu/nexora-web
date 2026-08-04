import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import type { ReactElement } from "react";
import { MapPin, Phone, Envelope, Clock } from "flowbite-react-icons/outline";
import { Whatsapp, Facebook, Instagram, Linkedin, Twitter } from "flowbite-react-icons/solid";
import { Reveal } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { MapEmbed } from "@/components/marketing/map-embed";
import { ContactForms } from "@/components/forms/contact-forms";
import { contact, whatsappHref, socials, type SocialPlatform } from "@/content/site";
import { contactHero, office } from "@/content/contact";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Get in touch with Nexora Property Management in Kampala, Uganda — request a quote, an assessment, or general enquiries.",
  path: "/contact",
  ogImage: "/images/og/nexora-og-contact.jpg",
});

type IconProps = { size?: number; className?: string };
const socialIcon: Record<SocialPlatform, (p: IconProps) => ReactElement> = {
  whatsapp: (p) => <Whatsapp {...p} />,
  facebook: (p) => <Facebook {...p} />,
  instagram: (p) => <Instagram {...p} />,
  linkedin: (p) => <Linkedin {...p} />,
  twitter: (p) => <Twitter {...p} />,
  youtube: (p) => <Whatsapp {...p} />,
};

export default function ContactPage() {
  return (
    <>
      <PageHero {...contactHero} />

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
          {/* Form panel */}
          <div className="lg:col-span-3">
            <Reveal>
              <div className="rounded-2xl border border-border bg-background p-6 shadow-xl md:p-8">
                <h2 className="font-heading text-h2 font-semibold text-foreground">
                  Send us a message
                </h2>
                <p className="mt-1 text-body text-muted">
                  We’ll get back to you promptly.
                </p>
                <div className="mt-6">
                  <ContactForms />
                </div>
              </div>
            </Reveal>
          </div>

          {/* Office info */}
          <div className="space-y-4 lg:col-span-2">
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                <h3 className="font-heading text-h3 font-semibold text-foreground">
                  Nexora Property Management
                </h3>
                <ul className="mt-5 space-y-4 text-body text-foreground">
                  <li className="flex items-start gap-3">
                    <MapPin size={20} className="mt-0.5 shrink-0 text-primary" />
                    <span>{contact.address}</span>
                  </li>
                  <li>
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                      className="flex items-start gap-3 transition-colors hover:text-primary"
                    >
                      <Phone size={20} className="mt-0.5 shrink-0 text-primary" />
                      <span>{contact.phone}</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-start gap-3 transition-colors hover:text-primary"
                    >
                      <Envelope size={20} className="mt-0.5 shrink-0 text-primary" />
                      <span>{contact.email}</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 transition-colors hover:text-primary"
                    >
                      <Whatsapp size={20} className="mt-0.5 shrink-0 text-primary" />
                      <span>{contact.whatsappDisplay}</span>
                    </a>
                  </li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <h3 className="font-heading text-h3 font-semibold text-foreground">
                    Business hours
                  </h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {office.hours.map((h) => (
                    <li key={h.day} className="flex justify-between text-body">
                      <span className="text-muted">{h.day}</span>
                      <span className="font-medium text-foreground">{h.time}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-5">
                  {socials.map((s) => (
                    <a
                      key={s.platform}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {socialIcon[s.platform]({ size: 18 })}
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Office map */}
        <Reveal delay={0.1}>
          <div className="mt-10">
            <MapEmbed lat={office.lat} lng={office.lng} label={`Nexora — ${office.address}`} />
          </div>
        </Reveal>
      </section>
    </>
  );
}
