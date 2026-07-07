import { ImageStatBand } from "./section-treatments";
import { stats } from "@/content/home";

/** Trust bar — image-backed frosted-glass count-up stats. */
export function HomeStats() {
  return (
    <ImageStatBand
      image="/images/properties/twin-towers-dusk.jpg"
      imageAlt="Nexora-managed residential towers at dusk"
      stats={stats}
    />
  );
}
