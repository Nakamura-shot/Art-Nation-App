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
function referralToken(m:any){
 return m?.referral?.ref || m?.message?.referral?.ref || m?.postback?.referral?.ref || null;
}
async function customerForPsid(psid:string){
 const rows=await rest<any[]>(`customers?select=id&messenger_psid=eq.${encodeURIComponent(psid)}&limit=1`,{},true);
 return rows[0]?.id||null;
}
async function connectReferral(psid:string,ref:string){
 const rows=await rest<any[]>(`messenger_connection_tokens?select=id,customer_id,booking_id,transactional_opt_in,marketing_opt_in,expires_at,used_at&token=eq.${encodeURIComponent(ref)}&limit=1`,{},true);
 const c=rows[0]; if(!c||c.used_at||new Date(c.expires_at)<new Date())return null;
 await rest(`customers?id=eq.${encodeURIComponent(c.customer_id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
  messenger_psid:String(psid),messenger_connected_at:new Date().toISOString(),
  messenger_transactional_opt_in:c.transactional_opt_in,messenger_marketing_opt_in:c.marketing_opt_in
 })},true);
 await rest(`messenger_connection_tokens?id=eq.${encodeURIComponent(c.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({used_at:new Date().toISOString()})},true);
 return c.customer_id as string;
}
async function storeInbound(psid:string,messaging:any,customerId:string|null){
 if(messaging?.message?.is_echo)return;
 let body:string|null=null, type="event", mid:string|null=null;
 if(messaging?.message){
  mid=messaging.message.mid||null;
  body=messaging.message.text||null;
  type=body?"text":messaging.message.attachments?.length?"attachment":"message";
  if(!body&&messaging.message.attachments?.length){
   body=messaging.message.attachments.map((a:any)=>`[${a.type||"attachment"}]`).join(" ");
  }
 }else if(messaging?.postback){body=messaging.postback.title||messaging.postback.payload||"[Postback]";type="postback"}
 else if(messaging?.referral){body="[Messenger connection/referral]";type="referral"}
 else return;
 const payload={customer_id:customerId,psid,direction:"inbound",message_mid:mid,message_type:type,body,raw_payload:messaging,status:"received"};
 try{await rest(`messenger_messages`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)},true)}catch(e:any){
  // Meta can retry webhooks. Ignore duplicate message IDs, surface anything else.
  if(!String(e?.message||e).includes("duplicate"))throw e;
 }
}

export async function GET(req:Request){
 const u=new URL(req.url);
 const mode=u.searchParams.get("hub.mode"), verify=u.searchParams.get("hub.verify_token"), challenge=u.searchParams.get("hub.challenge");
 if(mode==="subscribe" && verify && verify===process.env.META_VERIFY_TOKEN)return new Response(challenge||"",{status:200});
 return new Response("Forbidden",{status:403});
}
export async function POST(req:Request){
 const raw=await req.text();
 if(!validSignature(raw,req.headers.get("x-hub-signature-256")))return new Response("Invalid signature",{status:401});
 try{
  const body=JSON.parse(raw);
  for(const entry of body.entry||[]){
   for(const messaging of entry.messaging||[]){
    const psid=messaging?.sender?.id;
    if(!psid)continue;
    const ref=referralToken(messaging);
    let customerId:string|null=null;
    if(ref)customerId=await connectReferral(String(psid),String(ref));
    if(!customerId)customerId=await customerForPsid(String(psid));
    await storeInbound(String(psid),messaging,customerId);
   }
  }
  return NextResponse.json({ok:true});
 }catch(e:any){console.error("META_WEBHOOK_ERROR",e);return NextResponse.json({ok:true})}
}
