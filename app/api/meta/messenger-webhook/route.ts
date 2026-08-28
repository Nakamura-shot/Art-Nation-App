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
    const ref=referralToken(messaging);
    if(!psid||!ref)continue;
    const rows=await rest<any[]>(`messenger_connection_tokens?select=id,customer_id,booking_id,transactional_opt_in,marketing_opt_in,expires_at,used_at&token=eq.${encodeURIComponent(ref)}&limit=1`,{},true);
    const c=rows[0]; if(!c||c.used_at||new Date(c.expires_at)<new Date())continue;
    await rest(`customers?id=eq.${encodeURIComponent(c.customer_id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
     messenger_psid:String(psid),messenger_connected_at:new Date().toISOString(),
     messenger_transactional_opt_in:c.transactional_opt_in,messenger_marketing_opt_in:c.marketing_opt_in
    })},true);
    await rest(`messenger_connection_tokens?id=eq.${encodeURIComponent(c.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({used_at:new Date().toISOString()})},true);
   }
  }
  return NextResponse.json({ok:true});
 }catch(e:any){console.error("META_WEBHOOK_ERROR",e);return NextResponse.json({ok:true})}
}