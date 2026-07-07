import { MapPin } from "flowbite-react-icons/outline";

/**
 * Embedded location map. Uses the keyless OpenStreetMap iframe embed so it works
 * without an API key — swap for a Google Maps embed + key at launch if preferred.
 */
export function MapEmbed({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  const d = 0.012;
  const bbox = `${lng - d}%2C${lat - d * 0.7}%2C${lng + d}%2C${lat + d * 0.7}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <iframe
        title={`Map showing ${label}`}
        src={src}
        loading="lazy"
        className="h-72 w-full border-0"
      />
      <div className="flex items-center gap-2 bg-background p-3 text-caption text-muted">
        <MapPin size={16} className="shrink-0 text-primary" />
        {label}
      </div>
    </div>
  );
}
