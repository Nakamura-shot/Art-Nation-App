import type { ArtEvent, EventCategory, IntakeField } from "./types";
import { events as demoEvents, getEvent as getDemoEvent } from "./data";
import { isSupabaseConfigured, rest, publicEventCoverUrl } from "./supabase-rest";

type SessionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  regular_price: number | string;
  early_bird_price: number | string | null;
  early_bird_until: string | null;
  events: { id: string; slug: string; title: string; description: string | null; cover_image_path: string | null; guides: { id:string; slug:string; title:string } | null; event_types: { name: string } | null };
  locations: { id: string; name: string; address: string | null; slug: string | null };
  form_fields: Array<{ id: string; label: string; field_key: string; field_type: string; required: boolean; options: string[] | null; sort_order: number }>;
  bookings: Array<{ quantity: number; status: string }>;
};

function mapSession(row: SessionRow): ArtEvent {
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  const fields: IntakeField[] = [...(row.form_fields || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({ id: f.field_key, label: f.label, type: f.field_type as IntakeField["type"], required: f.required, options: f.options || undefined }));
  const booked = (row.bookings || []).filter((b) => b.status !== "cancelled").reduce((n, b) => n + b.quantity, 0);
  return {
    id: row.id,
    eventId: row.events.id,
    slug: row.events.slug,
    title: row.events.title,
    category: (row.events.event_types?.name || "Workshop") as EventCategory,
    description: row.events.description || "",
    image: publicEventCoverUrl(row.events.cover_image_path),
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(start),
    startTime: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(start),
    endTime: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(end),
    location: { id: row.locations.id, name: row.locations.name, address: row.locations.address || "", slug: row.locations.slug || undefined },
    capacity: row.capacity,
    booked,
    regularPrice: Number(row.regular_price),
    earlyBirdPrice: row.early_bird_price == null ? undefined : Number(row.early_bird_price),
    earlyBirdUntil: row.early_bird_until || undefined,
    intakeFields: fields,
    guide: row.events.guides ? { id: row.events.guides.id, slug: row.events.guides.slug, title: row.events.guides.title } : undefined
  };
}

const select = "id,starts_at,ends_at,capacity,regular_price,early_bird_price,early_bird_until,events!inner(id,slug,title,description,cover_image_path,guides(id,slug,title),event_types(name)),locations!inner(id,name,address,slug),form_fields(id,label,field_key,field_type,required,options,sort_order),bookings(quantity,status)";

export async function getEvents(): Promise<ArtEvent[]> {
  if (!isSupabaseConfigured()) return demoEvents;
  const rows = await rest<SessionRow[]>(`event_sessions?select=${encodeURIComponent(select)}&active=eq.true&order=starts_at.asc`, {}, true);
  return rows.map(mapSession);
}

export async function getEventBySlug(slug: string): Promise<ArtEvent | undefined> {
  if (!isSupabaseConfigured()) return getDemoEvent(slug);
  const rows = await rest<SessionRow[]>(`event_sessions?select=${encodeURIComponent(select)}&active=eq.true&events.slug=eq.${encodeURIComponent(slug)}&order=starts_at.asc&limit=1`, {}, true);
  return rows[0] ? mapSession(rows[0]) : undefined;
}
