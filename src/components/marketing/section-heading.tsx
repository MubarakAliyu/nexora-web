import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  tone?: "default" | "onDark";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  tone = "default",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        align === "center" && "mx-auto max-w-2xl text-center",
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        </Reveal>
      )}
      <Reveal delay={0.08}>
        <h2
          className={cn(
            "font-heading text-h1 font-semibold",
            tone === "onDark" ? "text-background" : "text-foreground",
          )}
        >
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.16}>
          <p
            className={cn(
              "mt-4 text-body",
              tone === "onDark" ? "text-background/75" : "text-muted",
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
