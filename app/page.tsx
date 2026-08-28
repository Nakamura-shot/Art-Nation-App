import Header from "@/components/Header";
import EventBrowser from "@/components/EventBrowser";
import { getEvents } from "@/lib/server-data";

export default async function Home() {
  const events = await getEvents();
  return (
    <>
      <Header />
      <main className="container">
        <section className="hero">
          <span className="eyebrow">ART NATION CEBU</span>
          <h1>Find your next painting session.</h1>
          <p>Browse Paint & Sip, kids&apos; art and special workshops by date, type or location.</p>
        </section>
        <EventBrowser events={events} />
      </main>
    </>
  );
}
