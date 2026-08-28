import {NextResponse} from "next/server";
import {rest} from "@/lib/supabase-rest";

export async function POST(req:Request,{params}:{params:Promise<{code:string}>}){
 try{
  const {code}=await params;const b=await req.json();
  const email=String(b.email||"").trim().toLowerCase();const name=String(b.name||"").trim();
  if(!email)return NextResponse.json({error:"Email is required."},{status:400});
  const codes=await rest<any[]>(`guide_activation_codes?select=id,guide_id,max_uses,uses,expires_at,active,guides!inner(title,slug)&code=eq.${encodeURIComponent(code.toUpperCase())}&limit=1`,{},true);
  const c=codes[0];if(!c||!c.active)return NextResponse.json({error:"This activation code is invalid or inactive."},{status:404});
  if(c.expires_at&&new Date(c.expires_at)<new Date())return NextResponse.json({error:"This activation code has expired."},{status:410});
  let customers=await rest<any[]>(`customers?select=id,full_name,email,portal_token&email=eq.${encodeURIComponent(email)}&limit=1`,{},true);
  let customer=customers[0];
  if(!customer){
   if(!name)return NextResponse.json({error:"Enter your name to activate this guide."},{status:400});
   const created=await rest<any[]>("customers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({full_name:name,email,marketing_opt_in:false})},true);
   customer=created[0];
  }
  const redemption=await rest<any[]>(`guide_activation_redemptions?select=id&activation_code_id=eq.${c.id}&customer_id=eq.${customer.id}&limit=1`,{},true);
  if(!redemption.length){
   if(Number(c.uses)>=Number(c.max_uses))return NextResponse.json({error:"This activation code has already reached its use limit."},{status:409});
   await rest("guide_activation_redemptions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({activation_code_id:c.id,customer_id:customer.id})},true);
   await rest(`guide_activation_codes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({uses:Number(c.uses)+1})},true);
  }
  const existingAccess=await rest<any[]>(`customer_guide_access?select=id&customer_id=eq.${customer.id}&guide_id=eq.${c.guide_id}&limit=1`,{},true);
  if(!existingAccess[0])await rest("customer_guide_access",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({customer_id:customer.id,guide_id:c.guide_id,source:`activation:${code.toUpperCase()}`})},true);
  const fresh=await rest<any[]>(`customers?select=id,portal_token&id=eq.${customer.id}&limit=1`,{},true);
  return NextResponse.json({ok:true,portalToken:fresh[0]?.portal_token,guideSlug:c.guides.slug,guideTitle:c.guides.title});
 }catch(e:any){console.error("ACTIVATION_ERROR",e);return NextResponse.json({error:e.message||"Could not activate guide."},{status:500})}
}