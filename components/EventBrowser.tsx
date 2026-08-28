"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ArtEvent } from "@/lib/types";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

function eventPrice(event: ArtEvent) {
  if (!event.earlyBirdPrice || !event.earlyBirdUntil) return event.regularPrice;
  return new Date() <= new Date(event.earlyBirdUntil) ? event.earlyBirdPrice : event.regularPrice;
}

export default function EventBrowser({ events }: { events: ArtEvent[] }) {
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");

  const locationNames = [...new Set(events.map((e) => e.location.name))];
  const filtered = useMemo(
    () => events.filter((e) => (category === "All" || e.category === category) && (location === "All" || e.location.name === location)),
    [events, category, location]
  );

  return (
    <>
      <div className="filters panel">
        <label>
          Event type
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>All</option>
            <option>Paint & Sip</option>
            <option>Kids Art</option>
            <option>Workshop</option>
          </select>
        </label>
        <label>
          Location
          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option>All</option>
            {locationNames.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>

      <div className="event-grid">
        {filtered.map((event) => {
          const seats = event.capacity - event.booked;
          const price = eventPrice(event);
          return (
            <article className="event-card" key={event.id}>
              <div className="art-placeholder">{event.image ? <img src={event.image} alt={event.title}/> : "🎨"}</div>
              <div className="event-card-body">
                <span className="pill">{event.category}</span>
                <h2>{event.title}</h2>
                <p className="muted">{new Date(`${event.date}T00:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })} · {event.startTime}</p>
                <p>{event.location.name}</p>
                <div className="price-row"><strong>{money(price)}</strong><span>{seats} spaces left</span></div>
                <Link className="button" href={`/events/${event.slug}`}>View & book</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
