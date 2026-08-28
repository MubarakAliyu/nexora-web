"use client";

import * as React from "react";
import {
  Home, Tools, MapPin, Truck, Grid, Cash, ShoppingBag, Bed, Lightbulb,
  GlassWater, Building, Users, Briefcase, Star, Heart, Sun, Tag, ClipboardList,
} from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

/**
 * The icon set an admin can pick from when creating a service type. Keys are
 * stored as plain strings on the record, so adding a new option here never
 * invalidates existing data — an unknown key just falls back to Tag.
 */
export const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Home, Tools, MapPin, Truck, Grid, Cash, ShoppingBag, Bed, Lightbulb,
  GlassWater, Building, Users, Briefcase, Star, Heart, Sun, Tag, ClipboardList,
};

export function ServiceIcon({ name, size = 18, className }: { name?: string; size?: number; className?: string }) {
  const Icon = (name && SERVICE_ICONS[name]) || Tag;
  return <Icon size={size} className={className} />;
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
      {Object.entries(SERVICE_ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          aria-label={key}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "flex h-11 w-full items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            value === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary/50 hover:text-foreground",
          )}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
