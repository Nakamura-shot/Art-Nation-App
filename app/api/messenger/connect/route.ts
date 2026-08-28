import {NextResponse} from "next/server";
import crypto from "crypto";
import {rest} from "@/lib/supabase-rest";

function token(){return `MSG-${crypto.randomBytes(12).toString("hex")}`}

export async function POST(req:Request){
 try{
  const b=await req.json();
  if(!b.customer_id && !String(b.name||"").trim()) return NextResponse.json({error:"Your name is required."},{status:400});
  const marketing=!!b.marketing_opt_in, transactional=b.transactional_opt_in!==false;
  let customer:any;

  if(b.customer_id){
   const rows=await rest<any[]>(`customers?select=id,full_name,email,phone& id=eq.${encodeURIComponent(b.customer_id)}&limit=1`.replace("?select=id,full_name,email,phone& id","?select=id,full_name,email,phone&id"),{},true);
   customer=rows[0];
  } else {
   const email=String(b.email||"").trim();
   const phone=String(b.phone||"").trim();
   if(email){
    const rows=await rest<any[]>(`customers?select=id,full_name,email,phone&email=eq.${encodeURIComponent(email)}&limit=1`,{},true);
    customer=rows[0];
   }
   if(!customer && phone){
    const rows=await rest<any[]>(`customers?select=id,full_name,email,phone&phone=eq.${encodeURIComponent(phone)}&limit=1`,{},true);
    customer=rows[0];
   }
   if(!customer){
    const rows=await rest<any[]>("customers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
     full_name:b.name,email:email||null,phone:phone||null
    })},true);
    customer=rows[0];
   }
  }
  if(!customer)return NextResponse.json({error:"Customer not found."},{status:404});

  await rest(`customers?id=eq.${encodeURIComponent(customer.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   messenger_transactional_opt_in:transactional,
   messenger_marketing_opt_in:marketing,
   messenger_consent_at:new Date().toISOString(),
   messenger_consent_source:b.source||"website"
  })},true);

  const made=await rest<any[]>("messenger_connection_tokens",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   token:token(),customer_id:customer.id,booking_id:b.booking_id||null,transactional_opt_in:transactional,marketing_opt_in:marketing,source:b.source||"website"
  })},true);

  const page=process.env.FACEBOOK_PAGE_USERNAME || process.env.NEXT_PUBLIC_FACEBOOK_PAGE_USERNAME;
  const connectUrl=page?`https://m.me/${page}?ref=${encodeURIComponent(made[0].token)}`:null;
  return NextResponse.json({ok:true,customerId:customer.id,token:made[0].token,connectUrl,needsMetaConfig:!page});
 }catch(e:any){console.error("MESSENGER_CONNECT_ERROR",e);return NextResponse.json({error:e.message||"Could not start Messenger connection."},{status:500})}
}