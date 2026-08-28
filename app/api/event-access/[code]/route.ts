import {NextResponse} from "next/server";
import {rest} from "@/lib/supabase-rest";

export async function POST(req:Request,{params}:{params:Promise<{code:string}>}){
 try{
  const {code}=await params;const b=await req.json();
  const reference=String(b.reference||"").trim().toUpperCase();
  const participantNo=Number(b.participant_no||0);
  const email=String(b.email||"").trim().toLowerCase();
  const name=String(b.name||"").trim();
  if(!reference||!participantNo||!email)return NextResponse.json({error:"Booking reference, participant number and email are required."},{status:400});

  const codes=await rest<any[]>(`event_guide_access_codes?select=id,event_session_id,guide_id,starts_at,expires_at,max_claims,claims,active,guides!inner(title,slug),event_sessions!inner(events!inner(title))&code=eq.${encodeURIComponent(code.toUpperCase())}&limit=1`,{},true);
  const c=codes[0];if(!c||!c.active)return NextResponse.json({error:"This event QR is invalid or inactive."},{status:404});
  const now=new Date();
  if(c.starts_at&&now<new Date(c.starts_at))return NextResponse.json({error:"Guide access for this event is not open yet."},{status:403});
  if(now>new Date(c.expires_at))return NextResponse.json({error:"This event QR has expired."},{status:410});
  if(c.max_claims!=null&&Number(c.claims)>=Number(c.max_claims))return NextResponse.json({error:"This event QR has reached its claim limit."},{status:409});

  const bookings=await rest<any[]>(`bookings?select=id,reference,status,event_session_id,participants(id,participant_no,answers,guide_email)&reference=eq.${encodeURIComponent(reference)}&event_session_id=eq.${c.event_session_id}&status=eq.confirmed&limit=1`,{},true);
  const booking=bookings[0];if(!booking)return NextResponse.json({error:"We could not find a confirmed booking for that reference at this event."},{status:404});
  const participant=(booking.participants||[]).find((p:any)=>Number(p.participant_no)===participantNo);
  if(!participant)return NextResponse.json({error:"That participant number is not part of this booking."},{status:404});

  let ents=await rest<any[]>(`guide_entitlements?select=id,status,customer_id,assigned_email&participant_id=eq.${participant.id}&guide_id=eq.${c.guide_id}&limit=1`,{},true);
  let ent=ents[0];
  if(!ent){
   const made=await rest<any[]>("guide_entitlements",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
    booking_id:booking.id,participant_id:participant.id,participant_no:participantNo,guide_id:c.guide_id,
    assigned_email:participant.guide_email||null,status:"unclaimed",source:"event-qr"
   })},true);ent=made[0];
  }

  if(ent.customer_id&&String(ent.assigned_email||"").toLowerCase()!==email){
   return NextResponse.json({error:"This participant's guide has already been assigned to another account."},{status:409});
  }

  let customers=await rest<any[]>(`customers?select=id,full_name,email,portal_token&email=eq.${encodeURIComponent(email)}&order=created_at.asc&limit=1`,{},true);
  let customer=customers[0];
  if(!customer){
   const created=await rest<any[]>("customers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
    full_name:name||`Participant ${participantNo}`,email,marketing_opt_in:false
   })},true);customer=created[0];
  }

  const previous=await rest<any[]>(`event_guide_access_claims?select=id&access_code_id=eq.${c.id}&entitlement_id=eq.${ent.id}&limit=1`,{},true);
  await rest(`guide_entitlements?id=eq.${ent.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   customer_id:customer.id,assigned_email:email,status:"claimed",claimed_at:new Date().toISOString()
  })},true);
  const existingAccess=await rest<any[]>(`customer_guide_access?select=id&customer_id=eq.${customer.id}&guide_id=eq.${c.guide_id}&limit=1`,{},true);
  if(!existingAccess[0])await rest("customer_guide_access",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   customer_id:customer.id,guide_id:c.guide_id,source:`event-qr:${c.id}:participant:${participantNo}`
  })},true);

  if(!previous.length){
   await rest("event_guide_access_claims",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
    access_code_id:c.id,entitlement_id:ent.id,customer_id:customer.id
   })},true);
   await rest(`event_guide_access_codes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({claims:Number(c.claims)+1})},true);
  }

  const fresh=await rest<any[]>(`customers?select=portal_token&id=eq.${customer.id}&limit=1`,{},true);
  return NextResponse.json({ok:true,portalToken:fresh[0]?.portal_token,guideSlug:c.guides.slug,guideTitle:c.guides.title});
 }catch(e:any){console.error("EVENT_QR_CLAIM_ERROR",e);return NextResponse.json({error:e.message||"Could not claim guide access."},{status:500})}
}