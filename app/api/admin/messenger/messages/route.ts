import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export async function GET(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const u=new URL(req.url); const customer=u.searchParams.get("customer"); const psid=u.searchParams.get("psid");
  let filter="";
  if(customer)filter=`&customer_id=eq.${encodeURIComponent(customer)}`;
  else if(psid)filter=`&psid=eq.${encodeURIComponent(psid)}`;
  const rows=await rest<any[]>(`messenger_messages?select=id,customer_id,psid,direction,message_mid,message_type,body,status,read_at,created_at${filter}&message_type=neq.referral&order=created_at.asc&limit=300`,{},true);
  return NextResponse.json({messages:rows});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not load Messenger messages."},{status:500})}
}

export async function PATCH(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  if(!b.customer_id&&!b.psid)return NextResponse.json({error:"Missing conversation."},{status:400});
  const filter=b.customer_id?`customer_id=eq.${encodeURIComponent(b.customer_id)}`:`psid=eq.${encodeURIComponent(b.psid)}`;
  await rest(`messenger_messages?${filter}&direction=eq.inbound&read_at=is.null`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({read_at:new Date().toISOString()})},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not mark messages read."},{status:500})}
}
