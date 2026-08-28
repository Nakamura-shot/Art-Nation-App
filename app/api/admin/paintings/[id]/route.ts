import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const b=await req.json();
  await rest(`guides?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   title:b.title,slug:slugify(b.slug||b.title),description:b.description||null,difficulty:b.difficulty||null,
   estimated_minutes:b.estimated_minutes?Number(b.estimated_minutes):null,canvas_size:b.canvas_size||null,
   materials:b.materials||null,access_mode:b.access_mode||"restricted",active:!!b.active,updated_at:new Date().toISOString()
  })},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not update painting."},{status:500})}
}