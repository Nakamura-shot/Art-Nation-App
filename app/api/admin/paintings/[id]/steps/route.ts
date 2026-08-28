import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const b=await req.json();
  const existing=await rest<any[]>(`guide_steps?select=id&guide_id=eq.${id}`,{},true);
  const n=existing.length+1;
  const rows=await rest<any[]>("guide_steps",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   guide_id:id,step_no:n,sort_order:n,title:b.title||`Step ${n}`,instructions:b.instructions||null,
   technique_id:b.technique_id||null,video_url:b.video_url||null
  })},true);
  return NextResponse.json({ok:true,id:rows[0].id});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not add step."},{status:500})}
}