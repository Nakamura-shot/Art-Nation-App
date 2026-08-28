import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export async function GET(){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const rows=await rest<any[]>(`locations?select=id,name,slug,address,public_description,image_path,website_url,opening_hours,contact_name,phone,email,notes,capacity_notes,maps_url,active,default_form_template_id,form_templates(name),location_menu_items(id,name,description,price,image_path,category,sort_order,active)&order=active.desc,name.asc`,{},true);
  return NextResponse.json(rows);
 }catch(e:any){return NextResponse.json({error:e.message||"Could not load locations."},{status:500})}
}

export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await req.json();
  if(!String(b.name||"").trim())return NextResponse.json({error:"Location name is required."},{status:400});
  let slug=slugify(b.slug||b.name);
  const existing=await rest<any[]>(`locations?select=id&slug=eq.${encodeURIComponent(slug)}`,{},true);
  if(existing.length)slug=`${slug}-${Date.now().toString().slice(-5)}`;
  const rows=await rest<any[]>("locations",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
    name:String(b.name).trim(),slug,address:b.address||null,public_description:b.public_description||null,
    website_url:b.website_url||null,opening_hours:b.opening_hours||null,
    contact_name:b.contact_name||null,phone:b.phone||null,email:b.email||null,notes:b.notes||null,
    capacity_notes:b.capacity_notes||null,maps_url:b.maps_url||null,
    default_form_template_id:b.default_form_template_id||null,active:b.active!==false
  })},true);
  return NextResponse.json({ok:true,location:rows[0]});
 }catch(e:any){console.error("LOCATION_CREATE_ERROR",e);return NextResponse.json({error:e.message||"Could not create location."},{status:500})}
}