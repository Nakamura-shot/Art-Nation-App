import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

function firstName(name:string){return String(name||"").trim().split(/\s+/)[0]||"there"}
function fmtDate(v?:string){if(!v)return "";return new Date(v).toLocaleDateString("en-PH",{timeZone:"Asia/Manila",month:"long",day:"numeric",year:"numeric"})}
function fmtTime(v?:string){if(!v)return "";return new Date(v).toLocaleTimeString("en-PH",{timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit"})}

async function renderTemplate(text:string,customer:any){
 let booking:any=null;
 if(customer?.id){
  const orders=await rest<any[]>(`orders?select=id,created_at,bookings(id,reference,quantity,event_sessions(starts_at,events(title),locations(name)))&customer_id=eq.${encodeURIComponent(customer.id)}&order=created_at.desc&limit=5`,{},true);
  for(const order of orders){if(order.bookings?.length){booking=order.bookings[0];break}}
 }
 const session=booking?.event_sessions;
 const vars:Record<string,string>={
  first_name:firstName(customer?.full_name),full_name:customer?.full_name||"",
  event_title:session?.events?.title||"your Art Nation event",
  booking_reference:booking?.reference||booking?.id?.slice(0,8)?.toUpperCase()||"",
  quantity:booking?.quantity?String(booking.quantity):"",
  location:session?.locations?.name||"",
  event_date:fmtDate(session?.starts_at),event_time:fmtTime(session?.starts_at),
  my_guides_url:`${process.env.NEXT_PUBLIC_APP_URL||"https://art-nation-app.vercel.app"}/guides`
 };
 return String(text||"").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,(all,key)=>Object.prototype.hasOwnProperty.call(vars,key)?vars[key]:all);
}

export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const token=process.env.META_PAGE_ACCESS_TOKEN;
  if(!token)return NextResponse.json({error:"META_PAGE_ACCESS_TOKEN is not configured in Vercel."},{status:503});
  const b=await req.json();
  let customer:any=null,psid=String(b.psid||"");
  if(b.customer_id){
   const rows=await rest<any[]>(`customers?select=id,full_name,email,phone,messenger_psid,messenger_connected_at,messenger_transactional_opt_in,messenger_marketing_opt_in&id=eq.${encodeURIComponent(b.customer_id)}&limit=1`,{},true);
   customer=rows[0];psid=customer?.messenger_psid||psid;
  }
  if(!psid)return NextResponse.json({error:"This customer is not connected to Messenger."},{status:400});
  const raw=String(b.message||"").trim();if(!raw)return NextResponse.json({error:"Message is empty."},{status:400});
  const text=await renderTemplate(raw,customer);

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
  return NextResponse.json({ok:true,message_id:data?.message_id||null,renderedMessage:text});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not send Messenger message."},{status:500})}
}
