import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

function sanitizeRichHtml(input:string){
  return String(input||"")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,"")
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,"")
    .replace(/javascript:/gi,"");
}

export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  const slugBase=slugify(b.title); let slug=slugBase;
  const existing=await rest<any[]>(`events?select=id&slug=eq.${encodeURIComponent(slug)}`,{},true);
  if(existing.length)slug=`${slugBase}-${Date.now().toString().slice(-6)}`;
  const ev=await rest<any[]>(`events`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
    title:b.title,slug,description:sanitizeRichHtml(b.description||""),event_type_id:b.event_type_id,guide_id:b.guide_id||null
  })},true);
  const event=ev[0];
  const starts=`${b.date}T${b.start_time}:00+08:00`, ends=`${b.date}T${b.end_time}:00+08:00`;
  const sessionRows=await rest<any[]>(`event_sessions`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
    event_id:event.id,location_id:b.location_id,starts_at:starts,ends_at:ends,capacity:b.capacity,
    regular_price:b.regular_price,early_bird_price:b.early_bird_price,
    early_bird_until:b.early_bird_until?`${b.early_bird_until}:00+08:00`:null,active:true
  })},true);
  const session=sessionRows[0];
  if(b.fields?.length)await rest(`form_fields`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(
    b.fields.map((f:any)=>({event_session_id:session.id,label:f.label,field_key:f.field_key,field_type:f.field_type,required:!!f.required,options:f.options,sort_order:f.sort_order}))
  )},true);
  return NextResponse.json({ok:true,id:session.id,eventId:event.id,slug});
 }catch(e:any){
  console.error("EVENT_CREATE_ERROR",e);
  return NextResponse.json({error:e.message||"Could not create event."},{status:500})
 }
}