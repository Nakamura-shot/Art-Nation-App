import {NextResponse} from "next/server";
import {rest} from "@/lib/supabase-rest";

async function loadToken(token:string){
 const rows=await rest<any[]>(`messenger_connection_tokens?select=id,token,participant_id,booking_id,expires_at,used_at,transactional_opt_in,marketing_opt_in,participants(id,full_name,is_child,age),bookings(id,event_sessions(events(title)))&token=eq.${encodeURIComponent(token)}&limit=1`,{},true);
 return rows[0]||null;
}

export async function GET(_:Request,{params}:{params:Promise<{token:string}>}){
 try{
  const {token}=await params; const row=await loadToken(token);
  if(!row||row.used_at||new Date(row.expires_at)<new Date())return NextResponse.json({error:"This Messenger invitation is no longer valid."},{status:404});
  return NextResponse.json({ok:true,participant:{name:row.participants?.full_name,isChild:!!row.participants?.is_child,age:row.participants?.age},eventTitle:row.bookings?.event_sessions?.events?.title||"your Art Nation event"});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not load invitation."},{status:500})}
}

export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){
 try{
  const {token}=await params; const row=await loadToken(token); const body=await req.json();
  if(!row||row.used_at||new Date(row.expires_at)<new Date())return NextResponse.json({error:"This Messenger invitation is no longer valid."},{status:404});
  if(row.participants?.is_child)return NextResponse.json({error:"Children use the booking contact for Messenger updates."},{status:400});
  const transactional=body.transactional_opt_in!==false,marketing=!!body.marketing_opt_in;
  if(!transactional)return NextResponse.json({error:"Please agree to booking updates to connect Messenger for this reservation."},{status:400});
  await rest(`messenger_connection_tokens?id=eq.${encodeURIComponent(row.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({transactional_opt_in:true,marketing_opt_in:marketing})},true);
  const page=process.env.FACEBOOK_PAGE_USERNAME||process.env.NEXT_PUBLIC_FACEBOOK_PAGE_USERNAME;
  if(!page)return NextResponse.json({error:"Messenger is not configured yet."},{status:503});
  return NextResponse.json({ok:true,connectUrl:`https://m.me/${page}?ref=${encodeURIComponent(row.token)}`});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not continue to Messenger."},{status:500})}
}
