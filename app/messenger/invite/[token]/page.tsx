import { notFound } from "next/navigation";
import Header from "@/components/Header";
import MessengerParticipantInvite from "@/components/MessengerParticipantInvite";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return notFound();

  return (
    <>
      <Header />
      <main className="narrow account-page">
        <section className="panel" style={{ maxWidth: 620, margin: "48px auto" }}>
          <MessengerParticipantInvite token={token} />
        </section>
      </main>
    </>
  );
}
