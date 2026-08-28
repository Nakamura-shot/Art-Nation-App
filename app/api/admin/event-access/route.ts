import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
import crypto from "crypto";

function code(){return `EVENT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`}

export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  const rows=await rest<any[]>(`event_sessions?select=id,starts_at,ends_at,capacity,events!inner(title,guide_id,guides(id,title))&id=eq.${encodeURIComponent(b.event_session_id)}&limit=1`,{},true);
  const s=rows[0];if(!s)return NextResponse.json({error:"Event not found."},{status:404});
  if(!s.events?.guide_id)return NextResponse.json({error:"Attach a painting guide to this event first."},{status:400});
  const starts=b.starts_at?new Date(b.starts_at).toISOString():new Date(new Date(s.starts_at).getTime()-60*60*1000).toISOString();
  const expires=b.expires_at?new Date(b.expires_at).toISOString():new Date(new Date(s.ends_at).getTime()+2*60*60*1000).toISOString();
  const made=await rest<any[]>("event_guide_access_codes",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   event_session_id:s.id,guide_id:s.events.guide_id,code:code(),label:b.label||`${s.events.title} event QR`,
   starts_at:starts,expires_at:expires,max_claims:null,active:true
  })},true);
  return NextResponse.json({ok:true,access:made[0]});
 }catch(e:any){console.error("EVENT_QR_CREATE_ERROR",e);return NextResponse.json({error:e.message||"Could not create event QR."},{status:500})}
}