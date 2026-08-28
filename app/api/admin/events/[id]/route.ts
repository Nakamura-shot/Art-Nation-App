import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

function sanitizeRichHtml(input:string){
 return String(input||"")
  .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
  .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,"")
  .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,"")
  .replace(/javascript:/gi,"");
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params; const b=await req.json();
  const rows=await rest<any[]>(`event_sessions?select=id,event_id&id=eq.${id}&limit=1`,{},true);
  if(!rows[0])return NextResponse.json({error:"Event session not found."},{status:404});
  const eventId=rows[0].event_id;

  await rest(`events?id=eq.${eventId}`,{
   method:"PATCH",headers:{Prefer:"return=minimal"},
   body:JSON.stringify({
    title:b.title,description:sanitizeRichHtml(b.description||""),event_type_id:b.event_type_id,guide_id:b.guide_id||null,
    ...(b.remove_cover?{cover_image_path:null}:{})
   })
  },true);

  const starts=`${b.date}T${b.start_time}:00+08:00`, ends=`${b.date}T${b.end_time}:00+08:00`;
  await rest(`event_sessions?id=eq.${id}`,{
   method:"PATCH",headers:{Prefer:"return=minimal"},
   body:JSON.stringify({
    location_id:b.location_id,starts_at:starts,ends_at:ends,capacity:b.capacity,
    regular_price:b.regular_price,early_bird_price:b.early_bird_price,
    early_bird_until:b.early_bird_until?`${b.early_bird_until}:00+08:00`:null
   })
  },true);

  await rest(`form_fields?event_session_id=eq.${id}`,{method:"DELETE",headers:{Prefer:"return=minimal"}},true);
  if(b.fields?.length)await rest("form_fields",{
    method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify(b.fields.map((f:any)=>({
      event_session_id:id,label:f.label,field_key:f.field_key,field_type:f.field_type,
      required:!!f.required,options:f.options,sort_order:f.sort_order
    })))
  },true);

  return NextResponse.json({ok:true,eventId});
 }catch(e:any){
  console.error("EVENT_EDIT_ERROR",e);
  return NextResponse.json({error:e.message||"Could not update event."},{status:500})
 }
}