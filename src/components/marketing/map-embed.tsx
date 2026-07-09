import { MapPin } from "flowbite-react-icons/outline";

/**
 * Embedded location map. Uses the standard **keyless Google Maps embed**
 * (`maps.google.com/maps?q=…&output=embed`) — renders a real Google map with a
 * marker and needs no API key for a basic embed.
 *
 * To upgrade later: swap `src` for the Maps Embed API
 * (`https://www.google.com/maps/embed/v1/place?key=YOUR_KEY&q=…`) and add the key.
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
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&hl=en&output=embed`;

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <iframe
        title={`Map showing ${label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-72 w-full border-0"
      />
      <div className="flex items-center gap-2 bg-background p-3 text-caption text-muted">
        <MapPin size={16} className="shrink-0 text-primary" />
        {label}
      </div>
    </div>
  );
}
