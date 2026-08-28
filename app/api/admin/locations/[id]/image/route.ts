import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest,uploadLocationImage} from "@/lib/supabase-rest";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const fd=await req.formData();const file=fd.get("file");
  if(!(file instanceof File)||!file.type.startsWith("image/"))return NextResponse.json({error:"Choose an image file."},{status:400});
  if(file.size>8*1024*1024)return NextResponse.json({error:"Image must be under 8 MB."},{status:400});
  const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"");
  const path=`${id}/${Date.now()}.${ext}`;
  await uploadLocationImage(path,file);
  await rest(`locations?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({image_path:path})},true);
  return NextResponse.json({ok:true,path});
 }catch(e:any){return NextResponse.json({error:e.message||"Could not upload image."},{status:500})}
}