import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  if(!String(b.name||"").trim()||!String(b.body||"").trim())return NextResponse.json({error:"Template name and message are required."},{status:400});
  const rows=await rest<any[]>("communication_templates",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   name:b.name,channel:b.channel||"messenger",category:b.category||"custom",subject:b.subject||null,body:b.body,active:true
  })},true);
  return NextResponse.json({ok:true,template:rows[0]});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not save template."},{status:500})}
}