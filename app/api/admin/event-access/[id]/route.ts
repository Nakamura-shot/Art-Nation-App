import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const b=await req.json();
  await rest(`event_guide_access_codes?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:!!b.active})},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not update QR."},{status:500})}
}