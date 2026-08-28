import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  const rows=await rest<any[]>("communication_log",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   customer_id:b.customer_id||null,booking_id:b.booking_id||null,template_id:b.template_id||null,
   channel:b.channel||"messenger",destination:b.destination||null,message_body:b.message_body||"",
   status:b.status||"prepared",sent_at:b.status==="sent_manual"?new Date().toISOString():null
  })},true);
  return NextResponse.json({ok:true,id:rows[0]?.id});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not save communication."},{status:500})}
}