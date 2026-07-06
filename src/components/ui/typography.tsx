import { createElement, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Heading */

const headingVariants = cva("font-heading text-foreground", {
  variants: {
    size: {
      hero: "text-hero font-medium tracking-[-0.01em]",
      h1: "text-h1 font-semibold tracking-[-0.01em]",
      h2: "text-h2 font-semibold tracking-[-0.01em]",
      h3: "text-h3 font-semibold",
      h4: "text-[1.125rem] font-medium",
    },
  },
  defaultVariants: { size: "h2" },
});

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /** Semantic heading level. Visual size is controlled independently by `size`. */
  as?: HeadingTag;
}

/**
 * Cinzel heading. `as` sets the semantic level (a11y/SEO), `size` sets the
 * visual scale — keep them decoupled so page hierarchy stays correct.
 */
export function Heading({
  as = "h2",
  size,
  className,
  children,
  ...props
}: HeadingProps) {
  return createElement(
    as,
    { className: cn(headingVariants({ size }), className), ...props },
    children,
  );
}

/* ------------------------------------------------------------------- Text */

const textVariants = cva("font-sans", {
  variants: {
    variant: {
      lead: "text-[1.125rem] leading-relaxed text-foreground",
      body: "text-body leading-relaxed text-foreground",
      muted: "text-body leading-relaxed text-muted",
      caption: "text-caption uppercase tracking-[0.08em] text-muted",
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
    },
  },
  defaultVariants: { variant: "body", weight: "regular" },
});

type TextTag = "p" | "span" | "div" | "label";

interface TextProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: TextTag;
  htmlFor?: string;
}

/** Montserrat body / caption text. */
export function Text({
  as = "p",
  variant,
  weight,
  className,
  children,
  ...props
}: TextProps) {
  return createElement(
    as,
    { className: cn(textVariants({ variant, weight }), className), ...props },
    children,
  );
}
