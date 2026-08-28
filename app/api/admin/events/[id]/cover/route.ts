import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest,uploadEventCover} from "@/lib/supabase-rest";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const fd=await req.formData(); const file=fd.get("file");
  if(!(file instanceof File))return NextResponse.json({error:"Choose an image first."},{status:400});
  if(!file.type.startsWith("image/"))return NextResponse.json({error:"Cover photo must be an image."},{status:400});
  if(file.size>8*1024*1024)return NextResponse.json({error:"Cover photo must be under 8 MB."},{status:400});
  const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
  const path=`${id}/${Date.now()}.${ext}`;
  await uploadEventCover(path,file);
  await rest(`events?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({cover_image_path:path})},true);
  return NextResponse.json({ok:true,path});
 }catch(e:any){
  console.error("EVENT_COVER_ERROR",e);
  return NextResponse.json({error:e.message||"Could not upload cover photo."},{status:500})
 }
}