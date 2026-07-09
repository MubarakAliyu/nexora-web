"use client";

import * as React from "react";
import Image from "next/image";
import { Lightbox } from "./lightbox";
import { cn } from "@/lib/utils";

/** Detail-page gallery: a large lead image + a thumbnail rail. If there are more
 *  images than fit, the last visible tile shows a "+N more" overlay; any tile
 *  opens the full lightbox. */
export function PropertyGallery({ images, alt }: { images: string[]; alt: string }) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  const thumbs = images.slice(1);
  const maxThumbs = 3;
  const shown = thumbs.slice(0, maxThumbs);
  const overflow = thumbs.length - shown.length; // hidden beyond the rail

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => openAt(0)}
          className="group relative col-span-full aspect-[16/9] overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image
            src={images[0]}
            alt={alt}
            fill
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute bottom-3 right-3 rounded-full bg-foreground/70 px-3 py-1 text-caption text-background">
            View gallery
          </span>
        </button>

        {shown.map((src, i) => {
          const showOverflow = overflow > 0 && i === shown.length - 1;
          return (
            <button
              type="button"
              key={`${src}-${i}`}
              onClick={() => openAt(i + 1)}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <Image
                src={src}
                alt={`${alt} — ${i + 2}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {showOverflow && (
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/65 font-heading text-h3 font-medium text-background backdrop-blur-[2px]">
                  +{overflow + 1} more
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Lightbox
        images={images}
        alt={alt}
        open={open}
        index={index}
        onClose={() => setOpen(false)}
        onIndex={setIndex}
      />
    </>
  );
}
