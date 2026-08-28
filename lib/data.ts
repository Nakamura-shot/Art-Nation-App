import { ArtEvent, Location } from "./types";

export const locations: Location[] = [
  {
    id: "anc-canduman",
    name: "Art Nation Cebu",
    address: "Eagle's Nest Condominium, Canduman, Mandaue City"
  },
  {
    id: "bambusa-liloan",
    name: "Bambusa Café",
    address: "Liloan, Cebu"
  }
];

export const events: ArtEvent[] = [
  {
    id: "evt-001",
    slug: "tropical-pop-paint-and-sip",
    title: "Tropical Pop Paint & Sip",
    category: "Paint & Sip",
    description: "A beginner-friendly guided acrylic session with a bold tropical subject, materials included.",
    date: "2026-09-05",
    startTime: "14:00",
    endTime: "18:00",
    location: locations[0],
    capacity: 30,
    booked: 11,
    regularPrice: 1200,
    earlyBirdPrice: 1000,
    earlyBirdUntil: "2026-09-01T23:59:59+08:00",
    intakeFields: [
      { id: "full-name", label: "Full name", type: "text", required: true },
      { id: "age", label: "Age", type: "number", required: true },
      {
        id: "drink",
        label: "Choice of drink",
        type: "select",
        required: true,
        options: ["Hot Chocolate", "Iced Coffee", "Lemonade"]
      }
    ]
  },
  {
    id: "evt-002",
    slug: "kids-unicorn-acrylic",
    title: "Kids Unicorn Acrylic Workshop",
    category: "Kids Art",
    description: "A simplified unicorn painting class designed for younger artists.",
    date: "2026-09-12",
    startTime: "10:00",
    endTime: "12:00",
    location: locations[0],
    capacity: 18,
    booked: 6,
    regularPrice: 900,
    intakeFields: [
      { id: "full-name", label: "Child's full name", type: "text", required: true },
      { id: "age", label: "Age", type: "number", required: true }
    ]
  },
  {
    id: "evt-003",
    slug: "cafe-sunset-paint-and-sip",
    title: "Café Sunset Paint & Sip",
    category: "Paint & Sip",
    description: "Paint a warm tropical sunset in a relaxed café setting.",
    date: "2026-09-19",
    startTime: "15:00",
    endTime: "18:00",
    location: locations[1],
    capacity: 24,
    booked: 9,
    regularPrice: 1250,
    earlyBirdPrice: 1050,
    earlyBirdUntil: "2026-09-14T23:59:59+08:00",
    intakeFields: [
      { id: "full-name", label: "Full name", type: "text", required: true },
      { id: "age", label: "Age", type: "number", required: true },
      {
        id: "drink",
        label: "Café drink",
        type: "select",
        required: true,
        options: ["Americano", "Latte", "Matcha", "Hot Chocolate"]
      }
    ]
  }
];

export function getEvent(slug: string) {
  return events.find((event) => event.slug === slug);
}

export function getPrice(event: ArtEvent) {
  if (!event.earlyBirdPrice || !event.earlyBirdUntil) return event.regularPrice;
  return new Date() <= new Date(event.earlyBirdUntil) ? event.earlyBirdPrice : event.regularPrice;
}
