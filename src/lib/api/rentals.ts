/**
 * Public rental + service-booking API over the mock DB. Mirrors the shape a
 * real backend would expose so the browse/booking UIs depend only on these
 * typed async accessors. Runtime mutations (bookings, inquiries) record an
 * audit entry + system notification so they surface live in the admin app.
 */

import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import type {
  Booking,
  Property,
  RentalListing,
  ServiceBooking,
  ServiceBookingKind,
  Unit,
} from "@/lib/mock/types";

export type { Booking, RentalListing, ServiceBooking, ServiceBookingKind } from "@/lib/mock/types";
export type { RentalType, RentalPaymentMode, ShortTermPricing, BookingStatus } from "@/lib/mock/types";

const mDelay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

/** Monthly-equivalent price used for filtering/sorting either rental type. */
export function monthlyPrice(p: Property): number {
  if (p.rentalType === "short-term") return p.shortTerm?.monthly ?? 0;
  return p.annualRent ? Math.round(p.annualRent / 12) : p.monthlyRevenue;
}

function asListing(p: Property): RentalListing {
  return p as RentalListing;
}

export interface RentalFilters {
  rentalType?: "short-term" | "long-term" | "all";
  category?: string; // "all" or Category
  location?: string; // free text (matches location substring)
  bedrooms?: number | "any"; // minimum bedrooms
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[]; // must include all
  q?: string;
}

/** All listable rentals (managed + onboarding), newest-value first. */
export async function listRentals(filters?: RentalFilters): Promise<RentalListing[]> {
  await mDelay();
  let rows = db.properties.filter((p) => p.rentalType && p.status !== "prospect").map(asListing);

  const f = filters ?? {};
  if (f.rentalType && f.rentalType !== "all") rows = rows.filter((p) => p.rentalType === f.rentalType);
  if (f.category && f.category !== "all") rows = rows.filter((p) => p.category === f.category);
  if (f.location) {
    const s = f.location.toLowerCase();
    rows = rows.filter((p) => p.location.toLowerCase().includes(s));
  }
  if (f.bedrooms && f.bedrooms !== "any") rows = rows.filter((p) => (p.bedrooms ?? 0) >= (f.bedrooms as number));
  if (typeof f.minPrice === "number") rows = rows.filter((p) => monthlyPrice(p) >= f.minPrice!);
  if (typeof f.maxPrice === "number") rows = rows.filter((p) => monthlyPrice(p) <= f.maxPrice!);
  if (f.amenities && f.amenities.length) {
    rows = rows.filter((p) => f.amenities!.every((a) => p.amenities.includes(a)));
  }
  if (f.q) {
    const s = f.q.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(s) || p.location.toLowerCase().includes(s));
  }
  return rows;
}

export interface DateRange {
  from: string; // ISO
  to: string; // ISO
}

export interface RentalDetail {
  property: RentalListing;
  units: Unit[];
  /** Booked date ranges (future, active) — used to block the booking calendar. */
  bookedRanges: DateRange[];
}

export async function getRentalDetail(id: string): Promise<RentalDetail> {
  await mDelay();
  const property = db.properties.find((p) => p.id === id && p.rentalType);
  if (!property) throw new Error("Rental not found");
  const propUnits = db.units.filter((u) => u.propertyId === id);
  const bookedRanges = db.bookings
    .filter((b) => b.propertyId === id && b.status !== "cancelled" && new Date(b.checkOut).getTime() >= Date.now())
    .map((b) => ({ from: b.checkIn, to: b.checkOut }));
  return { property: asListing(property), units: propUnits, bookedRanges };
}

/** Distinct locations + amenities for building filter controls. */
export async function getRentalFacets(): Promise<{ locations: string[]; amenities: string[]; categories: string[] }> {
  await mDelay(200);
  const listings = db.properties.filter((p) => p.rentalType && p.status !== "prospect");
  const locations = Array.from(new Set(listings.map((p) => p.location.split(",").pop()!.trim()))).sort();
  const amenities = Array.from(new Set(listings.flatMap((p) => p.amenities ?? []))).sort();
  const categories = Array.from(new Set(listings.map((p) => p.category))).sort();
  return { locations, amenities, categories };
}

/* --------------------------------------------------- short-term booking */

const ref = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

export interface BookingInput {
  propertyId: string;
  unitId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  specialRequests?: string;
  checkIn: string;
  checkOut: string;
  paymentMethod: string;
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  await mDelay(700); // simulate payment round-trip
  const property = db.properties.find((p) => p.id === input.propertyId);
  if (!property || !property.shortTerm) throw new Error("Property is not bookable");
  const unit = input.unitId ? db.units.find((u) => u.id === input.unitId) : undefined;

  const nights = Math.max(
    1,
    Math.round((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86_400_000),
  );
  const nightlyRate = property.shortTerm.daily;
  const cleaningFee = property.shortTerm.cleaningFee;
  const subtotal = nightlyRate * nights + cleaningFee;
  const taxes = Math.round((subtotal * 0.18) / 1000) * 1000;
  const total = subtotal + taxes;

  const booking: Booking = {
    id: `bkg_web_${Date.now()}`,
    reference: ref("NX-BK"),
    propertyId: property.id,
    propertyName: property.name,
    unitId: unit?.id,
    unitLabel: unit?.label,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    adults: input.adults,
    children: input.children,
    specialRequests: input.specialRequests,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    nightlyRate,
    cleaningFee,
    taxes,
    total,
    paymentMethod: input.paymentMethod,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  db.bookings.unshift(booking);
  recordMutation({
    entityType: "booking",
    entityId: booking.id,
    entityName: booking.reference,
    action: "created",
    summary: `New booking ${booking.reference} — ${property.name} (${nights} nights)`,
    after: { guest: booking.guestName, total: booking.total, checkIn: booking.checkIn },
    notify: { type: "system", title: "New booking", body: `${booking.guestName} booked ${property.name} for ${nights} nights.` },
  });
  return booking;
}

/* ------------------------------------------------ long-term inquiry (lead) */

export interface RentalInquiryInput {
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  preferredUnit?: string;
  moveInDate?: string;
  leaseDuration?: string;
  employment?: string;
  message?: string;
}

export async function createRentalInquiry(input: RentalInquiryInput) {
  await mDelay(600);
  const property = db.properties.find((p) => p.id === input.propertyId);
  const propName = property?.name ?? "a property";
  const details = [
    input.preferredUnit ? `Preferred unit: ${input.preferredUnit}` : null,
    input.moveInDate ? `Move-in: ${input.moveInDate}` : null,
    input.leaseDuration ? `Lease duration: ${input.leaseDuration}` : null,
    input.employment ? `Employment: ${input.employment}` : null,
    input.message ? `Message: ${input.message}` : null,
  ].filter(Boolean).join(" · ");

  const lead = db.addMarketingLead({
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: `Rental inquiry for ${propName}. ${details}`,
    source: "rental-inquiry",
    service: "Rental Management",
  });
  const reference = `NX-INQ-${Math.floor(100000 + Math.random() * 900000)}`;
  recordMutation({
    entityType: "lead",
    entityId: lead.id,
    entityName: input.name,
    action: "created",
    summary: `Rental inquiry — ${input.name} for ${propName}`,
    after: { property: propName, moveIn: input.moveInDate },
    notify: { type: "system", title: "New rental inquiry", body: `${input.name} enquired about ${propName}.` },
  });
  return { lead, reference };
}

/* --------------------------------------------------- service bookings */

export interface ServiceBookingInput {
  kind: ServiceBookingKind;
  category: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  propertyType?: string;
  size?: string;
  details?: string;
  date: string;
  time: string;
}

export async function createServiceBooking(input: ServiceBookingInput): Promise<ServiceBooking> {
  await mDelay(600);
  const booking: ServiceBooking = {
    id: `svb_web_${Date.now()}`,
    reference: ref("NX-SV"),
    kind: input.kind,
    category: input.category,
    name: input.name,
    email: input.email,
    phone: input.phone,
    location: input.location,
    propertyType: input.propertyType,
    size: input.size,
    details: input.details,
    date: input.date,
    time: input.time,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  db.serviceBookings.unshift(booking);
  recordMutation({
    entityType: "service-booking",
    entityId: booking.id,
    entityName: booking.reference,
    action: "created",
    summary: `New ${input.kind} booking ${booking.reference} — ${input.category}`,
    after: { name: booking.name, category: booking.category, date: booking.date },
    notify: { type: "system", title: "New service booking", body: `${booking.name} booked ${input.category}.` },
  });
  return booking;
}

/* --------------------------------------------------- admin/owner reads */

export async function listBookings(scope?: { ownerId?: string; forceError?: boolean }): Promise<Booking[]> {
  await mDelay();
  if (scope?.forceError) throw new Error("Failed to load bookings.");
  let rows = db.bookings;
  if (scope?.ownerId) {
    const owner = db.owners.find((o) => o.id === scope.ownerId);
    const ids = new Set(owner?.propertyIds ?? []);
    rows = rows.filter((b) => ids.has(b.propertyId));
  }
  return [...rows];
}

export async function listServiceBookings(scope?: { forceError?: boolean }): Promise<ServiceBooking[]> {
  await mDelay();
  if (scope?.forceError) throw new Error("Failed to load service bookings.");
  return [...db.serviceBookings];
}
