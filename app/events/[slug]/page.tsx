import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import BookingForm from "@/components/BookingForm";
import { getEventBySlug } from "@/lib/server-data";
import { getPrice } from "@/lib/data";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return notFound();
  const price = getPrice(event);
  const seats = event.capacity - event.booked;

  return (
    <>
      <Header />
      <main className="container detail-layout">
        <section>
          <div className="detail-art">{event.image ? <img src={event.image} alt={event.title}/> : "🎨"}</div>
          <span className="pill">{event.category}</span>
          <h1>{event.title}</h1>
          {/<[a-z][\s\S]*>/i.test(event.description) ?
            <div className="lead rich-description" dangerouslySetInnerHTML={{__html:event.description}} /> :
            <p className="lead plain-description">{event.description}</p>}
          <div className="facts panel">
            <div><small>Date</small><strong>{new Date(`${event.date}T00:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong></div>
            <div><small>Time</small><strong>{event.startTime}–{event.endTime}</strong></div>
            <div><small>Location</small><strong>{event.location.slug ? <Link className="location-booking-link" href={`/locations/${event.location.slug}`}>{event.location.name} →</Link> : event.location.name}</strong><span>{event.location.address}</span></div>
            <div><small>Availability</small><strong>{seats} spaces left</strong></div>
          </div>
          {event.earlyBirdPrice && price === event.earlyBirdPrice && <div className="notice">Early Bird pricing is currently active.</div>}{event.guide && <div className="event-guide-callout"><div><span className="eyebrow">DIGITAL GUIDE INCLUDED</span><strong>{event.guide.title}</strong><small>Confirmed participants receive access to the step-by-step painting guide after payment verification. The guide is not available before booking.</small></div><span className="guide-after-booking">🔒 Unlocks after confirmation</span></div>}
        </section>
        <BookingForm event={event} price={price} />
      </main>
    </>
  );
}
