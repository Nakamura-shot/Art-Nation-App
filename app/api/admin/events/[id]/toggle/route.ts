
import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const rows=await rest<any[]>(`event_sessions?select=id,active&id=eq.${id}&limit=1`,{},true);
  if(!rows[0])return NextResponse.json({error:"Event session not found."},{status:404});
  await rest(`event_sessions?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:!rows[0].active})},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not update event."},{status:500})}
}
