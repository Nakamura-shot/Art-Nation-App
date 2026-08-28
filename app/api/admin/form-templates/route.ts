import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export async function GET(){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const rows=await rest<any[]>(`form_templates?select=id,name,is_default,form_template_fields(id,label,field_key,field_type,required,options,sort_order)&order=is_default.desc,name.asc`,{},true);
  return NextResponse.json(rows);
 }catch(e:any){return NextResponse.json({error:e.message||"Could not load templates."},{status:500})}
}
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  if(!String(b.name||"").trim())return NextResponse.json({error:"Template name is required."},{status:400});
  if(b.is_default)await rest(`form_templates?is_default=eq.true`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({is_default:false})},true);
  const t=await rest<any[]>("form_templates",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name:String(b.name).trim(),is_default:!!b.is_default})},true);
  if(b.fields?.length)await rest("form_template_fields",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(
    b.fields.map((f:any,i:number)=>({template_id:t[0].id,label:f.label,field_key:f.field_key,field_type:f.field_type,required:!!f.required,options:f.options,sort_order:i}))
  )},true);
  return NextResponse.json({ok:true,id:t[0].id});
 }catch(e:any){console.error("FORM_TEMPLATE_ERROR",e);return NextResponse.json({error:e.message||"Could not save template."},{status:500})}
}