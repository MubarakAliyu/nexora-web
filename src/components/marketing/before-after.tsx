"use client";

import * as React from "react";
import Image from "next/image";
import { AngleLeft, AngleRight } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

interface BeforeAfterProps {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
}

/** Draggable before/after comparison. Pointer events cover mouse + touch;
 *  arrow keys move the handle. No motion — reduced-motion safe by nature. */
export function BeforeAfter({
  before,
  after,
  beforeAlt,
  afterAlt,
  className,
}: BeforeAfterProps) {
  const [pos, setPos] = React.useState(50);
  const ref = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const setFromClientX = React.useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  React.useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragging.current) setFromClientX(e.clientX);
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [setFromClientX]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative aspect-[16/10] w-full touch-none select-none overflow-hidden rounded-xl",
        className,
      )}
      onPointerDown={(e) => {
        dragging.current = true;
        setFromClientX(e.clientX);
      }}
    >
      {/* After (full) */}
      <Image
        src={after}
        alt={afterAlt}
        fill
        sizes="(max-width: 1024px) 100vw, 900px"
        className="object-cover"
      />
      <span className="absolute right-3 top-3 rounded-full bg-foreground/70 px-2.5 py-1 text-caption font-medium text-background">
        After
      </span>

      {/* Before (clipped to handle position) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <Image
          src={before}
          alt={beforeAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-foreground/70 px-2.5 py-1 text-caption font-medium text-background">
          Before
        </span>
      </div>

      {/* Handle */}
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-background" />
        <button
          type="button"
          role="slider"
          aria-label="Drag to compare before and after"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragging.current = true;
          }}
          className="pointer-events-auto absolute left-0 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
        >
          <AngleLeft size={14} />
          <AngleRight size={14} />
        </button>
      </div>
    </div>
  );
}
