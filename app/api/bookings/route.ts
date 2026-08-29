import { NextResponse } from "next/server";
import crypto from "crypto";
import { isSupabaseConfigured, rest } from "@/lib/supabase-rest";
import { accountFromRequest } from "@/lib/customer-auth";

function messengerToken(){return `PMSG-${crypto.randomBytes(12).toString("hex")}`}

async function getOrCreateBookingCustomer(payload:any){
  const account=await accountFromRequest();
  if(account){
    const rows=await rest<any[]>(`customers?id=eq.${encodeURIComponent(account.customerId)}`,{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({
        full_name:payload.contact.name,email:payload.contact.email,phone:payload.contact.phone,
        messenger_transactional_opt_in:!!payload.messenger?.transactionalOptIn,
        messenger_marketing_opt_in:!!payload.messenger?.marketingOptIn,
        messenger_consent_at:payload.messenger?.transactionalOptIn?new Date().toISOString():null,
        messenger_consent_source:payload.messenger?.transactionalOptIn?"booking":null
      })
    },true);
    return {customer:rows[0],loggedIn:true};
  }

  const existing=await rest<any[]>(`customers?select=id,full_name,email,phone&email=eq.${encodeURIComponent(payload.contact.email)}&order=created_at.asc&limit=1`,{},true);
  if(existing[0]){
    const rows=await rest<any[]>(`customers?id=eq.${encodeURIComponent(existing[0].id)}`,{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({
        full_name:payload.contact.name,phone:payload.contact.phone,
        messenger_transactional_opt_in:!!payload.messenger?.transactionalOptIn,
        messenger_marketing_opt_in:!!payload.messenger?.marketingOptIn,
        messenger_consent_at:payload.messenger?.transactionalOptIn?new Date().toISOString():null,
        messenger_consent_source:payload.messenger?.transactionalOptIn?"booking":null
      })
    },true);
    return {customer:rows[0],loggedIn:false};
  }

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
  return {customer:customers[0],loggedIn:false};
}

async function rememberParticipant(ownerCustomerId:string, participant:any, participantRow:any){
  const name=String(participant.fullName||"").trim(); if(!name)return;
  const existing=await rest<any[]>(`saved_participants?select=id&owner_customer_id=eq.${encodeURIComponent(ownerCustomerId)}&full_name=ilike.${encodeURIComponent(name)}&is_child=eq.${participant.isChild?"true":"false"}&limit=1`,{},true);
  const values={full_name:name,is_child:!!participant.isChild,age:participant.isChild?Number(participant.age)||null:null,last_used_at:new Date().toISOString()};
  if(existing[0])await rest(`saved_participants?id=eq.${encodeURIComponent(existing[0].id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(values)},true);
  else await rest("saved_participants",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_customer_id:ownerCustomerId,...values})},true);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured yet. Add the environment variables first." }, { status: 503 });

  try {
    const payload = await request.json();
    if (!payload?.eventId || !payload?.quantity || !payload?.contact?.name || !payload?.contact?.email || !payload?.contact?.phone) return NextResponse.json({ error: "Missing required booking information." }, { status: 400 });
    if(!Array.isArray(payload.participants)||payload.participants.length!==Number(payload.quantity))return NextResponse.json({error:"Participant details are incomplete."},{status:400});
    for(const p of payload.participants){if(!String(p.fullName||"").trim())return NextResponse.json({error:"Every participant needs a name."},{status:400});if(p.isChild&&(!p.age||Number(p.age)<1||Number(p.age)>17))return NextResponse.json({error:"Please enter a valid age for each child participant."},{status:400})}

    const sessionRows = await rest<any[]>(`event_sessions?select=id,capacity,regular_price,early_bird_price,early_bird_until,events(title),bookings(quantity,status)&id=eq.${encodeURIComponent(payload.eventId)}&limit=1`, {}, true);
    const session = sessionRows[0];
    if (!session) return NextResponse.json({ error: "Event session not found." }, { status: 404 });

    const alreadyBooked = (session.bookings || []).filter((b: any) => b.status !== "cancelled").reduce((n: number, b: any) => n + Number(b.quantity), 0);
    if (alreadyBooked + Number(payload.quantity) > Number(session.capacity)) return NextResponse.json({ error: "Not enough spaces remain for this booking." }, { status: 409 });

    const earlyActive = session.early_bird_price && session.early_bird_until && new Date() <= new Date(session.early_bird_until);
    const unitPrice = Number(earlyActive ? session.early_bird_price : session.regular_price);
    const total = unitPrice * Number(payload.quantity);

    const {customer,loggedIn}=await getOrCreateBookingCustomer(payload);
    const orders = await rest<any[]>("orders", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ customer_id: customer.id, status: "payment_pending", total }) }, true);
    const order = orders[0];
    const bookings = await rest<any[]>("bookings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ order_id: order.id, event_session_id: payload.eventId, quantity: Number(payload.quantity), unit_price: unitPrice, status: "payment_pending" }) }, true);
    const booking = bookings[0];

    const participantRows = await rest<any[]>("participants", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify((payload.participants || []).map((participant: any, index: number) => ({
        booking_id: booking.id, participant_no: index + 1, full_name:String(participant.fullName||"").trim(), is_child:!!participant.isChild,
        age:participant.isChild?Number(participant.age)||null:null, answers: participant.answers || {}, guide_email: participant.guideEmail || null,
        customer_id:index===0 && String(participant.fullName||"").trim().toLowerCase()===String(payload.contact.name||"").trim().toLowerCase() && !participant.isChild ? customer.id : null
      })))
    }, true);

    for(let i=0;i<participantRows.length;i++)await rememberParticipant(customer.id,payload.participants[i],participantRows[i]);

    const participantInvites:any[]=[];
    for(const p of participantRows){
      if(p.is_child) {participantInvites.push({participantId:p.id,fullName:p.full_name,isChild:true,inviteUrl:null});continue;}
      if(p.customer_id===customer.id)continue;
      const made=await rest<any[]>("messenger_connection_tokens",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({token:messengerToken(),customer_id:null,participant_id:p.id,booking_id:booking.id,transactional_opt_in:true,marketing_opt_in:false,source:"participant_invite",expires_at:new Date(Date.now()+14*86400000).toISOString()})},true);
      participantInvites.push({participantId:p.id,fullName:p.full_name,isChild:false,inviteUrl:`${new URL(request.url).origin}/messenger/invite/${encodeURIComponent(made[0].token)}`});
    }

    const payments = await rest<any[]>("payments", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ order_id: order.id, method: payload.paymentMethod, amount: total, receipt_path: null, status: "pending_review" }) }, true);
    const payment = payments[0];

    return NextResponse.json({ ok: true, bookingId: booking.id, orderId: order.id, paymentId: payment.id, reference: booking.reference || booking.id.slice(0,8).toUpperCase(), customerId: customer.id, participantInvites, loggedIn, total });
  } catch (error) {
    console.error("BOOKING_CREATE_ERROR", error);
    const message = error instanceof Error ? error.message : "Unknown booking error";
    return NextResponse.json({ error: "Could not create booking.", detail: message }, { status: 500 });
  }
}
