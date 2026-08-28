import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest,uploadGuideMedia} from "@/lib/supabase-rest";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const fd=await req.formData();const file=fd.get("file");
  if(!(file instanceof File)||!file.type.startsWith("image/"))return NextResponse.json({error:"Choose an image."},{status:400});
  const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"");const path=`${id}/cover-${Date.now()}.${ext}`;
  await uploadGuideMedia(path,file);await rest(`guides?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({cover_image_path:path})},true);
  return NextResponse.json({ok:true,path});
 }catch(e:any){return NextResponse.json({error:e.message||"Upload failed."},{status:500})}
}