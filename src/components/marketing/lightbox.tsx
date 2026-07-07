"use client";

import * as React from "react";
import Image from "next/image";
import { AngleLeft, AngleRight, Close } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

interface LightboxProps {
  images: string[];
  alt: string;
  open: boolean;
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}

/** Fullscreen gallery lightbox — CSS crossfade, prev/next, keyboard (Esc / ← / →),
 *  thumbnails, body-scroll lock. Animated open/close via opacity (no AnimatePresence). */
export function Lightbox({ images, alt, open, index, onClose, onIndex }: LightboxProps) {
  const go = React.useCallback(
    (d: number) => onIndex((index + d + images.length) % images.length),
    [index, images.length, onIndex],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go, onClose]);

  return (
    <div
      role="dialog"
      aria-modal={open}
      aria-label="Image gallery"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[60] flex flex-col bg-foreground/95 transition-opacity duration-300",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-background/30 text-background transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Close size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous image"
          className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-background/30 text-background transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:left-6"
        >
          <AngleLeft size={24} />
        </button>

        <div className="relative h-full max-h-[68vh] w-full max-w-4xl">
          {open &&
            images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={cn(
                  "absolute inset-0 transition-opacity duration-300",
                  i === index ? "opacity-100" : "opacity-0",
                )}
              >
                <Image
                  src={src}
                  alt={`${alt} — image ${i + 1}`}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              </div>
            ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next image"
          className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-background/30 text-background transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:right-6"
        >
          <AngleRight size={24} />
        </button>
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto p-4">
        {images.map((src, i) => (
          <button
            type="button"
            key={`thumb-${src}-${i}`}
            onClick={() => onIndex(i)}
            aria-label={`View image ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={cn(
              "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
              i === index
                ? "border-primary"
                : "border-transparent opacity-60 hover:opacity-100",
            )}
          >
            <Image src={src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
