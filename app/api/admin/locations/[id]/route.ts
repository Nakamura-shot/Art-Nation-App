import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const b=await req.json();
  await rest(`locations?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({
    name:String(b.name||"").trim(),slug:slugify(b.slug||b.name),address:b.address||null,
    public_description:b.public_description||null,website_url:b.website_url||null,opening_hours:b.opening_hours||null,
    contact_name:b.contact_name||null,phone:b.phone||null,email:b.email||null,notes:b.notes||null,
    capacity_notes:b.capacity_notes||null,maps_url:b.maps_url||null,default_form_template_id:b.default_form_template_id||null,
    active:!!b.active
  })},true);
  return NextResponse.json({ok:true});
 }catch(e:any){console.error("LOCATION_UPDATE_ERROR",e);return NextResponse.json({error:e.message||"Could not update location."},{status:500})}
}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const used=await rest<any[]>(`event_sessions?select=id&location_id=eq.${id}&limit=1`,{},true);
  if(used.length)return NextResponse.json({error:"This location is already used by an event. Set it inactive instead."},{status:409});
  await rest(`locations?id=eq.${id}`,{method:"DELETE",headers:{Prefer:"return=minimal"}},true);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not delete location."},{status:500})}
}