import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json(); let slug=slugify(b.slug||b.title);
  const existing=await rest<any[]>(`techniques?select=id&slug=eq.${encodeURIComponent(slug)}`,{},true);
  if(existing.length)slug=`${slug}-${Date.now().toString().slice(-5)}`;
  const rows=await rest<any[]>("techniques",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   title:b.title,slug,short_description:b.short_description||null,category:b.category||null,instructions:b.instructions||null,
   video_url:b.video_url||null,active:b.active!==false
  })},true);
  return NextResponse.json({ok:true,id:rows[0].id,slug});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not create technique."},{status:500})}
}