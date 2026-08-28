import { NextResponse } from "next/server";
import { isSupabaseConfigured, rest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured yet. Add the environment variables first." }, { status: 503 });
  }

  try {
    const payload = await request.json();

    if (!payload?.eventId || !payload?.quantity || !payload?.contact?.name || !payload?.contact?.email || !payload?.contact?.phone) {
      return NextResponse.json({ error: "Missing required booking information." }, { status: 400 });
    }

    const sessionRows = await rest<any[]>(
      `event_sessions?select=id,capacity,regular_price,early_bird_price,early_bird_until,bookings(quantity,status)&id=eq.${encodeURIComponent(payload.eventId)}&limit=1`,
      {},
      true
    );
    const session = sessionRows[0];
    if (!session) return NextResponse.json({ error: "Event session not found." }, { status: 404 });

    const alreadyBooked = (session.bookings || [])
      .filter((b: any) => b.status !== "cancelled")
      .reduce((n: number, b: any) => n + Number(b.quantity), 0);

    if (alreadyBooked + Number(payload.quantity) > Number(session.capacity)) {
      return NextResponse.json({ error: "Not enough spaces remain for this booking." }, { status: 409 });
    }

    const earlyActive = session.early_bird_price && session.early_bird_until && new Date() <= new Date(session.early_bird_until);
    const unitPrice = Number(earlyActive ? session.early_bird_price : session.regular_price);
    const total = unitPrice * Number(payload.quantity);

    const customers = await rest<any[]>("customers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ full_name: payload.contact.name, email: payload.contact.email, phone: payload.contact.phone,
        messenger_transactional_opt_in: !!payload.messenger?.transactionalOptIn,
        messenger_marketing_opt_in: !!payload.messenger?.marketingOptIn,
        messenger_consent_at: payload.messenger?.transactionalOptIn ? new Date().toISOString() : null,
        messenger_consent_source: payload.messenger?.transactionalOptIn ? "booking" : null
      })
    }, true);
    const customer = customers[0];

    const orders = await rest<any[]>("orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ customer_id: customer.id, status: "payment_pending", total })
    }, true);
    const order = orders[0];

    const bookings = await rest<any[]>("bookings", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        order_id: order.id,
        event_session_id: payload.eventId,
        quantity: Number(payload.quantity),
        unit_price: unitPrice,
        status: "payment_pending"
      })
    }, true);
    const booking = bookings[0];

    await rest("participants", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        (payload.participants || []).map((participant: any, index: number) => ({
          booking_id: booking.id,
          participant_no: index + 1,
          answers: participant.answers || {},
          guide_email: participant.guideEmail || null
        }))
      )
    }, true);

    const payments = await rest<any[]>("payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        order_id: order.id,
        method: payload.paymentMethod,
        amount: total,
        receipt_path: null,
        status: "pending_review"
      })
    }, true);
    const payment = payments[0];

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      orderId: order.id,
      paymentId: payment.id,
      reference: booking.reference || booking.id.slice(0,8).toUpperCase(),
      customerId: customer.id,
      total
    });
  } catch (error) {
    console.error("BOOKING_CREATE_ERROR", error);
    const message = error instanceof Error ? error.message : "Unknown booking error";
    return NextResponse.json({ error: "Could not create booking.", detail: message }, { status: 500 });
  }
}
