import {NextResponse} from "next/server";
import crypto from "crypto";
import {rest} from "@/lib/supabase-rest";

function validSignature(raw:string,sig:string|null){
 const secret=process.env.META_APP_SECRET;
 if(!secret)return true;
 if(!sig?.startsWith("sha256="))return false;
 const expected="sha256="+crypto.createHmac("sha256",secret).update(raw).digest("hex");
 try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(sig))}catch{return false}
}
function referralToken(m:any){return m?.referral?.ref || m?.message?.referral?.ref || m?.postback?.referral?.ref || null}
async function customerForPsid(psid:string){
 const rows=await rest<any[]>(`customers?select=id&messenger_psid=eq.${encodeURIComponent(psid)}&limit=1`,{},true);
 return rows[0]?.id||null;
}

async function customerForParticipant(participantId:string,transactional:boolean,marketing:boolean){
 const rows=await rest<any[]>(`participants?select=id,full_name,is_child,customer_id,booking_id,bookings(order_id,orders(customer_id))&id=eq.${encodeURIComponent(participantId)}&limit=1`,{},true);
 const p=rows[0]; if(!p||p.is_child)return null;
 if(p.customer_id)return p.customer_id as string;
 const created=await rest<any[]>("customers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
  full_name:p.full_name||"Art Nation participant",messenger_transactional_opt_in:transactional,messenger_marketing_opt_in:marketing,
  messenger_consent_at:new Date().toISOString(),messenger_consent_source:"participant_invite"
 })},true);
 const customerId=created[0]?.id; if(!customerId)return null;
 await rest(`participants?id=eq.${encodeURIComponent(p.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({customer_id:customerId})},true);
 const ownerId=p.bookings?.orders?.customer_id;
 if(ownerId){
  const saved=await rest<any[]>(`saved_participants?select=id&owner_customer_id=eq.${encodeURIComponent(ownerId)}&full_name=ilike.${encodeURIComponent(p.full_name||"")}&is_child=eq.false&limit=1`,{},true);
  if(saved[0])await rest(`saved_participants?id=eq.${encodeURIComponent(saved[0].id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({linked_customer_id:customerId,last_used_at:new Date().toISOString()})},true);
 }
 return customerId as string;
}

async function connectReferral(psid:string,ref:string){
 const rows=await rest<any[]>(`messenger_connection_tokens?select=id,customer_id,participant_id,booking_id,transactional_opt_in,marketing_opt_in,expires_at,used_at&token=eq.${encodeURIComponent(ref)}&limit=1`,{},true);
 const c=rows[0]; if(!c||c.used_at||new Date(c.expires_at)<new Date())return null;
 let customerId=c.customer_id as string|null;
 if(!customerId&&c.participant_id)customerId=await customerForParticipant(c.participant_id,!!c.transactional_opt_in,!!c.marketing_opt_in);
 if(!customerId)return null;
 await rest(`customers?id=eq.${encodeURIComponent(customerId)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
  messenger_psid:String(psid),messenger_connected_at:new Date().toISOString(),messenger_transactional_opt_in:!!c.transactional_opt_in,
  messenger_marketing_opt_in:!!c.marketing_opt_in,messenger_consent_at:new Date().toISOString(),messenger_consent_source:c.participant_id?"participant_invite":"website"
 })},true);
 await rest(`messenger_connection_tokens?id=eq.${encodeURIComponent(c.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({used_at:new Date().toISOString(),customer_id:customerId})},true);
 return customerId;
}

async function storeInbound(psid:string,messaging:any,customerId:string|null){
 if(messaging?.message?.is_echo)return;
 let body:string|null=null,type="event",mid:string|null=null;
 if(messaging?.message){
  mid=messaging.message.mid||null;body=messaging.message.text||null;type=body?"text":messaging.message.attachments?.length?"attachment":"message";
  if(!body&&messaging.message.attachments?.length)body=messaging.message.attachments.map((a:any)=>`[${a.type||"attachment"}]`).join(" ");
 }else if(messaging?.postback){body=messaging.postback.title||messaging.postback.payload||"[Postback]";type="postback"}
 else if(messaging?.referral){return} // Connection/referral events update CRM status but do not belong in the chat transcript.
 else return;
 const payload={customer_id:customerId,psid,direction:"inbound",message_mid:mid,message_type:type,body,raw_payload:messaging,status:"received"};
 try{await rest("messenger_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)},true)}catch(e:any){if(!String(e?.message||e).includes("duplicate"))throw e}
}

export async function GET(req:Request){
 const u=new URL(req.url);const mode=u.searchParams.get("hub.mode"),verify=u.searchParams.get("hub.verify_token"),challenge=u.searchParams.get("hub.challenge");
 if(mode==="subscribe"&&verify&&verify===process.env.META_VERIFY_TOKEN)return new Response(challenge||"",{status:200});
 return new Response("Forbidden",{status:403});
}
export async function POST(req:Request){
 const raw=await req.text();if(!validSignature(raw,req.headers.get("x-hub-signature-256")))return new Response("Invalid signature",{status:401});
 try{
  const body=JSON.parse(raw);
  for(const entry of body.entry||[])for(const messaging of entry.messaging||[]){
   const psid=messaging?.sender?.id;if(!psid)continue;const ref=referralToken(messaging);let customerId:string|null=null;
   if(ref)customerId=await connectReferral(String(psid),String(ref));if(!customerId)customerId=await customerForPsid(String(psid));await storeInbound(String(psid),messaging,customerId);
  }
  return NextResponse.json({ok:true});
 }catch(e:any){console.error("META_WEBHOOK_ERROR",e);return NextResponse.json({ok:true})}
}
