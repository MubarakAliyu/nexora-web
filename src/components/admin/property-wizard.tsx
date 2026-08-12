"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, TrashBin, CheckCircle, AngleLeft, Image as ImageIcon, VideoCamera, FileLines, ClipboardList } from "flowbite-react-icons/outline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatUGX } from "@/lib/format";
import { createProperty, updateProperty, ownerOptions, type Property } from "@/lib/api/admin";
import { categories } from "@/content/portfolio";

const AMENITIES = [
  "Parking", "Wi-Fi", "Security", "Generator", "Swimming Pool", "CCTV", "Gym", "Elevator",
  "Water Tank", "Garden", "Playground", "Laundry Room", "Rooftop Access", "Furnished",
  "Air Conditioning", "Balcony", "Pet Friendly",
];

const STEPS = ["Basic Details", "Rental Config", "Structure", "Pricing", "Amenities", "Media", "Documents & Review"];

interface WizardValues {
  name: string; category: string; location: string; description: string; ownerId: string;
  rentalType: "short-term" | "long-term";
  minStay: number; maxStay: number; minLease: number;
  buildings: { name: string; floors: number }[];
  bedrooms: number; bathrooms: number;
  dailyRate: number; weeklyRate: number; monthlyRate: number;
  monthlyRent: number; annualRent: number;
  status: string;
}

const empty: WizardValues = {
  name: "", category: "", location: "", description: "", ownerId: "",
  rentalType: "long-term", minStay: 1, maxStay: 90, minLease: 12,
  buildings: [{ name: "Block A", floors: 4 }], bedrooms: 2, bathrooms: 1,
  dailyRate: 150_000, weeklyRate: 900_000, monthlyRate: 3_000_000,
  monthlyRent: 2_500_000, annualRent: 30_000_000, status: "onboarding",
};

export function PropertyWizard({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Property | null;
  onDone: () => void;
}) {
  const isEdit = !!editing;
  const owners = React.useMemo(() => ownerOptions(), []);
  const [step, setStep] = React.useState(0);
  const [amenities, setAmenities] = React.useState<string[]>([]);
  const [images, setImages] = React.useState<string[]>([]);
  const [videos, setVideos] = React.useState<string[]>([]);
  const [floorPlans, setFloorPlans] = React.useState<string[]>([]);
  const [documents, setDocuments] = React.useState<string[]>([]);
  const [videoUrl, setVideoUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const { register, control, watch, reset, trigger, getValues, setValue, formState: { errors } } = useForm<WizardValues>({
    defaultValues: empty, mode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({ control, name: "buildings" });
  const rentalType = watch("rentalType");
  const monthlyRent = watch("monthlyRent");

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    if (editing) {
      reset({
        name: editing.name, category: editing.category, location: editing.location, description: editing.description ?? "", ownerId: editing.ownerId,
        rentalType: editing.rentalType ?? "long-term",
        minStay: editing.minStay ?? 1, maxStay: editing.maxStay ?? 90, minLease: editing.minStay ?? 12,
        buildings: editing.buildings.map((b) => ({ name: b.name, floors: b.floors })),
        bedrooms: editing.bedrooms ?? 2, bathrooms: editing.bathrooms ?? 1,
        dailyRate: editing.shortTerm?.daily ?? 150_000, weeklyRate: editing.shortTerm?.weekly ?? 900_000, monthlyRate: editing.shortTerm?.monthly ?? 3_000_000,
        monthlyRent: editing.annualRent ? Math.round(editing.annualRent / 12) : 2_500_000, annualRent: editing.annualRent ?? 30_000_000,
        status: editing.status,
      });
      setAmenities(editing.amenities ?? []);
      setImages([]); setVideos(editing.videos ?? []); setFloorPlans(editing.floorPlans ?? []); setDocuments(editing.documents ?? []);
    } else {
      reset(empty);
      setAmenities([]); setImages([]); setVideos([]); setFloorPlans([]); setDocuments([]);
    }
  }, [open, editing, reset]);

  // Auto-calc annual = monthly × 12 (editable) for long-term.
  React.useEffect(() => {
    if (rentalType === "long-term") setValue("annualRent", (Number(monthlyRent) || 0) * 12);
  }, [monthlyRent, rentalType, setValue]);

  const STEP_FIELDS: (keyof WizardValues)[][] = [
    ["name", "category", "location", "ownerId"],
    ["rentalType"],
    ["buildings", "bedrooms", "bathrooms"],
    rentalType === "short-term" ? ["dailyRate", "monthlyRate"] : ["monthlyRent", "annualRent"],
    [], [], [],
  ];

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(6, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggleAmenity = (a: string) => setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const addVideo = () => { if (/^https?:\/\/.+/.test(videoUrl)) { setVideos((v) => [...v, videoUrl]); setVideoUrl(""); } else toast.error("Enter a valid URL (http/https)"); };
  const addFake = (setter: React.Dispatch<React.SetStateAction<string[]>>, prefix: string) => setter((f) => [...f, `${prefix}-${f.length + 1}.${prefix === "video" ? "mp4" : prefix === "floorplan" ? "pdf" : "jpg"}`]);

  const submit = async () => {
    const v = getValues();
    setSubmitting(true);
    try {
      const input = {
        name: v.name, location: v.location, category: v.category as Property["category"], status: v.status as Property["status"],
        ownerId: v.ownerId, units: v.buildings.reduce((s, b) => s + Math.max(1, Number(b.floors)), 0),
        description: v.description || undefined, bedrooms: Number(v.bedrooms), bathrooms: Number(v.bathrooms),
        buildingsConfig: v.buildings.map((b) => ({ name: b.name, floors: Number(b.floors) })),
        rentalType: v.rentalType, rentalPayment: (v.rentalType === "short-term" ? "online" : "manual") as "online" | "manual",
        minStay: v.rentalType === "short-term" ? Number(v.minStay) : Number(v.minLease), maxStay: Number(v.maxStay),
        amenities, videos, floorPlans, documents,
        ...(v.rentalType === "short-term"
          ? { dailyRate: Number(v.dailyRate), weeklyRate: Number(v.weeklyRate), monthlyRate: Number(v.monthlyRate) }
          : { annualRent: Number(v.annualRent), monthlyRate: Number(v.monthlyRent) }),
      };
      if (isEdit && editing) { await updateProperty(editing.id, input); toast.success(`Property updated — ${v.name}`); }
      else { await createProperty(input); toast.success(`Property created — ${v.name}`); }
      onOpenChange(false); onDone();
    } catch {
      toast.error(isEdit ? "Couldn’t update property" : "Couldn’t create property", { description: "Please try again." });
    } finally { setSubmitting(false); }
  };

  const v = watch();
  const FileList = ({ items, onRemove, empty: e }: { items: string[]; onRemove: (i: number) => void; empty: string }) => (
    items.length === 0 ? <p className="text-caption text-muted">{e}</p> : (
      <ul className="space-y-1.5">{items.map((f, i) => (
        <li key={i} className="flex items-center justify-between rounded-md border border-border bg-surface-hover px-3 py-1.5 text-caption">
          <span className="truncate text-foreground">{f}</span>
          <button type="button" onClick={() => onRemove(i)} className="text-muted hover:text-primary" aria-label={`Remove ${f}`}><TrashBin size={14} /></button>
        </li>))}
      </ul>
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Property" : "Add a Property"} — Step {step + 1} of 7</DialogTitle>
          <DialogDescription>{STEPS[step]}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />
          ))}
        </div>

        <div className="min-h-[280px] py-2">
          {/* STEP 1 — basic */}
          {step === 0 && (
            <div key="s0" className="space-y-4 motion-safe:animate-in motion-safe:fade-in">
              <Field label="Property name" htmlFor="pw-name" error={errors.name?.message}><Input id="pw-name" {...register("name", { required: "Enter a name" })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Property type" htmlFor="pw-type" error={errors.category?.message}>
                  <select id="pw-type" className={selectClass} {...register("category", { required: "Choose a type" })}>
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Mixed-Use">Mixed-Use</option>
                  </select>
                </Field>
                <Field label="Owner" htmlFor="pw-owner" error={errors.ownerId?.message}>
                  <select id="pw-owner" className={selectClass} {...register("ownerId", { required: "Select an owner" })}>
                    <option value="">Select an owner…</option>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Address / location" htmlFor="pw-loc" error={errors.location?.message}><Input id="pw-loc" {...register("location", { required: "Enter a location" })} /></Field>
              <Field label="Description" htmlFor="pw-desc"><Textarea id="pw-desc" rows={3} {...register("description")} /></Field>
            </div>
          )}

          {/* STEP 2 — rental config */}
          {step === 1 && (
            <div key="s1" className="space-y-4 motion-safe:animate-in motion-safe:fade-in">
              <p className="text-caption font-medium uppercase tracking-wide text-muted">Rental type</p>
              <div className="grid grid-cols-2 gap-3">
                {(["short-term", "long-term"] as const).map((t) => (
                  <label key={t} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-4 transition-colors", rentalType === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <input type="radio" value={t} {...register("rentalType")} className="h-4 w-4 text-primary" />
                    <span className="font-medium capitalize text-foreground">{t.replace("-", " ")}</span>
                  </label>
                ))}
              </div>
              {rentalType === "short-term" ? (
                <div className="grid gap-4 sm:grid-cols-3 motion-safe:animate-in motion-safe:fade-in">
                  <Field label="Min stay (days)" htmlFor="pw-min"><Input id="pw-min" type="number" {...register("minStay", { valueAsNumber: true })} /></Field>
                  <Field label="Max stay (days)" htmlFor="pw-max"><Input id="pw-max" type="number" {...register("maxStay", { valueAsNumber: true })} /></Field>
                  <Field label="Payment method" htmlFor="pw-pay"><Input id="pw-pay" value="Online" disabled /></Field>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 motion-safe:animate-in motion-safe:fade-in">
                  <Field label="Min lease (months)" htmlFor="pw-minlease"><Input id="pw-minlease" type="number" {...register("minLease", { valueAsNumber: true })} /></Field>
                  <Field label="Payment method" htmlFor="pw-pay2"><Input id="pw-pay2" value="Manual (Bank Transfer)" disabled /></Field>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — structure */}
          {step === 2 && (
            <div key="s2" className="space-y-4 motion-safe:animate-in motion-safe:fade-in">
              <div className="flex items-center justify-between">
                <p className="text-caption font-medium uppercase tracking-wide text-muted">Buildings ({fields.length})</p>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => append({ name: `Block ${String.fromCharCode(65 + fields.length)}`, floors: 4 })}><Plus size={15} /> Add Building</Button>
              </div>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-[1fr_120px_auto] items-end gap-2">
                    <Field label={i === 0 ? "Building name" : ""} htmlFor={`pw-b-${i}`}><Input id={`pw-b-${i}`} {...register(`buildings.${i}.name` as const)} /></Field>
                    <Field label={i === 0 ? "Floors" : ""} htmlFor={`pw-bf-${i}`}><Input id={`pw-bf-${i}`} type="number" {...register(`buildings.${i}.floors` as const, { valueAsNumber: true })} /></Field>
                    <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(i)} aria-label="Remove building"><TrashBin size={16} /></Button>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Default bedrooms per unit" htmlFor="pw-beds"><Input id="pw-beds" type="number" {...register("bedrooms", { valueAsNumber: true })} /></Field>
                <Field label="Default bathrooms per unit" htmlFor="pw-baths"><Input id="pw-baths" type="number" {...register("bathrooms", { valueAsNumber: true })} /></Field>
              </div>
              <p className="rounded-lg bg-surface-hover p-3 text-caption text-muted">Individual units will be created in the Units module after the property is set up. This defines the structural template.</p>
            </div>
          )}

          {/* STEP 4 — pricing */}
          {step === 3 && (
            <div key="s3" className="space-y-4 motion-safe:animate-in motion-safe:fade-in">
              {rentalType === "short-term" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Daily rate (UGX)" htmlFor="pw-daily"><Input id="pw-daily" type="number" {...register("dailyRate", { valueAsNumber: true })} /></Field>
                  <Field label="Weekly rate (UGX)" htmlFor="pw-weekly"><Input id="pw-weekly" type="number" {...register("weeklyRate", { valueAsNumber: true })} /></Field>
                  <Field label="Monthly rate (UGX)" htmlFor="pw-monthly"><Input id="pw-monthly" type="number" {...register("monthlyRate", { valueAsNumber: true })} /></Field>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Monthly rent (UGX)" htmlFor="pw-mrent"><Input id="pw-mrent" type="number" {...register("monthlyRent", { valueAsNumber: true })} /></Field>
                  <Field label="Annual rent (UGX) — auto ×12" htmlFor="pw-arent"><Input id="pw-arent" type="number" {...register("annualRent", { valueAsNumber: true })} /></Field>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — amenities */}
          {step === 4 && (
            <div key="s4" className="motion-safe:animate-in motion-safe:fade-in">
              <p className="mb-3 text-caption font-medium uppercase tracking-wide text-muted">Select amenities ({amenities.length})</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} aria-pressed={amenities.includes(a)}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      amenities.includes(a) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted hover:border-primary hover:text-primary")}>
                    {amenities.includes(a) && <CheckCircle size={13} />}{a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6 — media */}
          {step === 5 && (
            <div key="s5" className="space-y-5 motion-safe:animate-in motion-safe:fade-in">
              <section>
                <p className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-muted"><ImageIcon size={15} /> Images</p>
                <button type="button" onClick={() => addFake(setImages, "image")} className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-border py-6 text-muted transition-colors hover:border-primary hover:text-primary">
                  <ImageIcon size={22} /><span className="text-caption">Click to add an image (mocked)</span>
                </button>
                <div className="mt-2"><FileList items={images} onRemove={(i) => setImages((f) => f.filter((_, j) => j !== i))} empty="No images added." /></div>
              </section>
              <section>
                <p className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-muted"><VideoCamera size={15} /> Videos</p>
                <div className="flex gap-2"><Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/…" /><Button type="button" variant="outline" onClick={addVideo}>Add</Button></div>
                <div className="mt-2"><FileList items={videos} onRemove={(i) => setVideos((f) => f.filter((_, j) => j !== i))} empty="No video URLs added." /></div>
              </section>
              <section>
                <p className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-muted"><FileLines size={15} /> Floor plans</p>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addFake(setFloorPlans, "floorplan")}><Plus size={14} /> Upload floor plan (mocked)</Button>
                <div className="mt-2"><FileList items={floorPlans} onRemove={(i) => setFloorPlans((f) => f.filter((_, j) => j !== i))} empty="No floor plans added." /></div>
              </section>
            </div>
          )}

          {/* STEP 7 — documents + review */}
          {step === 6 && (
            <div key="s6" className="space-y-5 motion-safe:animate-in motion-safe:fade-in">
              <section>
                <p className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-muted"><ClipboardList size={15} /> Documents</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => addFake(setDocuments, "ownership")}>Ownership doc</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addFake(setDocuments, "contract")}>Contract</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addFake(setDocuments, "other")}>Other</Button>
                </div>
                <div className="mt-2"><FileList items={documents} onRemove={(i) => setDocuments((f) => f.filter((_, j) => j !== i))} empty="No documents added." /></div>
              </section>
              <section className="rounded-xl border border-border p-4">
                <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted">Review</p>
                <dl className="space-y-1.5 text-caption">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Property</dt><dd className="text-right text-foreground">{v.name || "—"} · {v.category || "—"} · {v.location || "—"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Owner</dt><dd className="text-foreground">{owners.find((o) => o.id === v.ownerId)?.name ?? "—"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Rental</dt><dd className="text-foreground">{v.rentalType} · {v.rentalType === "short-term" ? `${formatUGX(v.dailyRate)}/night` : `${formatUGX(v.monthlyRent)}/mo`}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Structure</dt><dd className="text-foreground">{v.buildings?.length} building(s) · {v.bedrooms} bed / {v.bathrooms} bath default</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Amenities</dt><dd className="max-w-[60%] text-right text-foreground">{amenities.length ? amenities.join(", ") : "—"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Media</dt><dd className="text-foreground">{images.length} images · {videos.length} videos · {floorPlans.length} floor plans</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Documents</dt><dd className="text-foreground">{documents.length} uploaded</dd></div>
                </dl>
              </section>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          {step > 0 ? <Button type="button" variant="outline" className="gap-1.5" onClick={back}><AngleLeft size={16} /> Back</Button> : <span />}
          {step < 6 ? (
            <Button type="button" onClick={next}>Next</Button>
          ) : (
            <Button type="button" onClick={submit} loading={submitting}>{isEdit ? "Update Property" : "Create Property"}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
