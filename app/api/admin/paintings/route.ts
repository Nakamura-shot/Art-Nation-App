import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();let slug=slugify(b.slug||b.title);
  const existing=await rest<any[]>(`guides?select=id&slug=eq.${encodeURIComponent(slug)}`,{},true);
  if(existing.length)slug=`${slug}-${Date.now().toString().slice(-5)}`;
  const rows=await rest<any[]>("guides",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   title:b.title,slug,description:b.description||null,difficulty:b.difficulty||null,estimated_minutes:b.estimated_minutes?Number(b.estimated_minutes):null,
   canvas_size:b.canvas_size||null,materials:b.materials||null,access_mode:b.access_mode||"restricted",active:b.active!==false
  })},true);
  return NextResponse.json({ok:true,id:rows[0].id,slug});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not create painting."},{status:500})}
}