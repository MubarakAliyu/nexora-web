import { StatCardsSection } from "./section-treatments";
import { stats } from "@/content/home";

/** Trust bar — light, elevated, hover-animated count-up stat cards. */
export function HomeStats() {
  return <StatCardsSection stats={stats} />;
}
