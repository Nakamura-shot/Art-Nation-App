import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const token=process.env.META_PAGE_ACCESS_TOKEN;
  if(!token)return NextResponse.json({error:"META_PAGE_ACCESS_TOKEN is not configured in Vercel."},{status:503});
  const b=await req.json();
  const text=String(b.message||"").trim(); if(!text)return NextResponse.json({error:"Message is empty."},{status:400});
  let customer:any=null,psid=String(b.psid||"");
  if(b.customer_id){
   const rows=await rest<any[]>(`customers?select=id,full_name,messenger_psid,messenger_connected_at,messenger_transactional_opt_in,messenger_marketing_opt_in&id=eq.${encodeURIComponent(b.customer_id)}&limit=1`,{},true);
   customer=rows[0]; psid=customer?.messenger_psid||psid;
  }
  if(!psid)return NextResponse.json({error:"This customer is not connected to Messenger."},{status:400});

  const graph=await fetch("https://graph.facebook.com/me/messages",{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
   body:JSON.stringify({recipient:{id:psid},messaging_type:"RESPONSE",message:{text}})
  });
  const data=await graph.json().catch(()=>({}));
  if(!graph.ok){
   await rest("messenger_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({customer_id:customer?.id||b.customer_id||null,psid,direction:"outbound",message_type:"text",body:text,raw_payload:data,status:"failed"})},true);
   return NextResponse.json({error:data?.error?.message||"Meta could not send the message.",meta:data},{status:graph.status||500});
  }
  await rest("messenger_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({customer_id:customer?.id||b.customer_id||null,psid,direction:"outbound",message_mid:data?.message_id||null,message_type:"text",body:text,raw_payload:data,status:"sent"})},true);
  await rest("communication_log",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({customer_id:customer?.id||b.customer_id||null,channel:"messenger",destination:psid,message_body:text,status:"sent",sent_at:new Date().toISOString()})},true);
  return NextResponse.json({ok:true,message_id:data?.message_id||null});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not send Messenger message."},{status:500})}
}
