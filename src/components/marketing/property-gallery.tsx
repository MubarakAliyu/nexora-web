"use client";

import * as React from "react";
import Image from "next/image";
import { Lightbox } from "./lightbox";

/** Detail-page gallery: a large lead image + thumbnail tiles, each opening the lightbox. */
export function PropertyGallery({ images, alt }: { images: string[]; alt: string }) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

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
        {images.slice(1).map((src, i) => (
          <button
            type="button"
            key={`${src}-${i}`}
            onClick={() => openAt(i + 1)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src={src}
              alt={`${alt} — ${i + 2}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
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
