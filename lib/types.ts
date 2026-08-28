export type EventCategory = "Paint & Sip" | "Kids Art" | "Workshop";

export type Location = {
  id: string;
  name: string;
  address: string;
  slug?: string;
};

export type IntakeField = {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: string[];
};

export type ArtEvent = {
  id: string;
  eventId?: string;
  slug: string;
  title: string;
  category: EventCategory;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: Location;
  capacity: number;
  booked: number;
  regularPrice: number;
  earlyBirdPrice?: number;
  earlyBirdUntil?: string;
  image?: string;
  intakeFields: IntakeField[];
  guide?: { id: string; slug: string; title: string };
};
