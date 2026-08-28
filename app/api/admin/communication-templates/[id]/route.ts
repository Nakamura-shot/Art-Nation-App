import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const b=await req.json();
  if(!String(b.name||"").trim()||!String(b.body||"").trim())return NextResponse.json({error:"Template name and message are required."},{status:400});
  await rest(`communication_templates?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   name:b.name,category:b.category||"custom",subject:b.subject||null,body:b.body,active:b.active!==false,updated_at:new Date().toISOString()
  })},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not update template."},{status:500})}
}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;await rest(`communication_templates?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:false,updated_at:new Date().toISOString()})},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not archive template."},{status:500})}
}