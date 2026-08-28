
import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const rows=await rest<any[]>(`event_sessions?select=*,events!inner(title,description,event_type_id),form_fields(label,field_key,field_type,required,options,sort_order)&id=eq.${id}&limit=1`,{},true);
  const s=rows[0]; if(!s)return NextResponse.json({error:"Event session not found."},{status:404});
  const suffix=Date.now().toString().slice(-6);
  const ev=await rest<any[]>("events",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({title:`${s.events.title} (Copy)`,slug:`copy-${suffix}-${s.events.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`,description:s.events.description,event_type_id:s.events.event_type_id})},true);
  const start=new Date(new Date(s.starts_at).getTime()+7*86400000).toISOString(), end=new Date(new Date(s.ends_at).getTime()+7*86400000).toISOString();
  const sess=await rest<any[]>("event_sessions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({event_id:ev[0].id,location_id:s.location_id,starts_at:start,ends_at:end,capacity:s.capacity,regular_price:s.regular_price,early_bird_price:s.early_bird_price,early_bird_until:s.early_bird_until?new Date(new Date(s.early_bird_until).getTime()+7*86400000).toISOString():null,active:false})},true);
  if(s.form_fields?.length)await rest("form_fields",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(s.form_fields.map((f:any)=>({...f,id:undefined,event_session_id:sess[0].id})))},true);
  return NextResponse.json({ok:true,id:sess[0].id});
 }catch(e:any){console.error("EVENT_DUPLICATE_ERROR",e);return NextResponse.json({error:e.message||"Could not duplicate event."},{status:500})}
}
