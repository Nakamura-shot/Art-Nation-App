import { NextResponse } from "next/server";
import { accountFromRequest } from "@/lib/customer-auth";
import { rest } from "@/lib/supabase-rest";

export async function GET() {
  try {
    const account = await accountFromRequest();
    if (!account) return NextResponse.json({ loggedIn: false });

    const saved = await rest<any[]>(
      `saved_participants?select=id,full_name,is_child,age,linked_customer_id,last_used_at&owner_customer_id=eq.${encodeURIComponent(account.customerId)}&order=last_used_at.desc`,
      {}, true
    );
    const orders = await rest<any[]>(
      `orders?select=id,status,total,created_at,bookings(id,reference,quantity,status,event_sessions(starts_at,events(title),locations(name)))&customer_id=eq.${encodeURIComponent(account.customerId)}&order=created_at.desc&limit=20`,
      {}, true
    );
    const customerRows = await rest<any[]>(
      `customers?select=id,full_name,email,phone,messenger_connected_at,messenger_marketing_opt_in&id=eq.${encodeURIComponent(account.customerId)}&limit=1`,
      {}, true
    );
    return NextResponse.json({ loggedIn: true, customer: customerRows[0] || account, savedParticipants: saved, orders });
  } catch (e: any) {
    return NextResponse.json({ loggedIn: false, error: e.message || "Could not load account." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const account = await accountFromRequest();
    if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!fullName) return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    const rows = await rest<any[]>(`customers?id=eq.${encodeURIComponent(account.customerId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ full_name: fullName, phone: phone || null })
    }, true);
    return NextResponse.json({ ok: true, customer: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not update account." }, { status: 500 });
  }
}
