import { CtaBanner } from "./cta-banner";
import { ctaBanner } from "@/content/home";
import { whatsappHref } from "@/content/site";

/** Homepage finale CTA — uses the shared image-backed CtaBanner treatment. */
export function HomeCta() {
  return (
    <CtaBanner
      heading={ctaBanner.heading}
      subline={ctaBanner.subline}
      image={ctaBanner.image}
      imageAlt={ctaBanner.imageAlt}
      primary={ctaBanner.primary}
      secondary={{
        label: "or chat with us on WhatsApp",
        href: whatsappHref,
        external: true,
      }}
    />
  );
}
