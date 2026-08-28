import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
import crypto from "crypto";

function makeCode(){
 return `AN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();if(!b.guide_id)return NextResponse.json({error:"Choose a painting guide."},{status:400});
  const count=Math.min(100,Math.max(1,Number(b.count||1)));const rows=[];
  for(let i=0;i<count;i++){
   let code=makeCode();
   const created=await rest<any[]>("guide_activation_codes",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
    code,guide_id:b.guide_id,label:b.label||null,max_uses:Math.max(1,Number(b.max_uses||1)),
    expires_at:b.expires_at||null,active:true
   })},true);
   rows.push(created[0]);
  }
  return NextResponse.json({ok:true,codes:rows});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not create activation codes."},{status:500})}
}