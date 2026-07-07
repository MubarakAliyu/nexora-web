import {
  Building,
  Home,
  Cog,
  WandMagicSparkles,
  ShieldCheck,
  AdjustmentsHorizontal,
  Truck,
  ChartLineUp,
  Globe,
  Eye,
  BadgeCheck,
  Headphones,
  Lock,
  Award,
} from "flowbite-react-icons/outline";

import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

/** Maps content icon keys → Flowbite icons (single source for home sections). */
const registry: Record<string, IconComponent> = {
  building: Building,
  home: Home,
  cog: Cog,
  sparkles: WandMagicSparkles,
  shield: ShieldCheck,
  tools: AdjustmentsHorizontal,
  vehicle: Truck,
  chart: ChartLineUp,
  globe: Globe,
  eye: Eye,
  quality: BadgeCheck,
  support: Headphones,
  protection: Lock,
  award: Award,
};

export function SectionIcon({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = registry[name] ?? Building;
  return <Icon size={size} className={className} />;
}
