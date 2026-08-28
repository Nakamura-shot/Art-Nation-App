import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest,uploadGuideMedia} from "@/lib/supabase-rest";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const fd=await req.formData();const file=fd.get("file");const kind=String(fd.get("kind")||"image");
  if(!(file instanceof File))return NextResponse.json({error:"Choose a file."},{status:400});
  if(file.size>30*1024*1024)return NextResponse.json({error:"Media must be under 30 MB."},{status:400});
  const ext=(file.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"");const path=`steps/${id}/${kind}-${Date.now()}.${ext}`;
  await uploadGuideMedia(path,file);
  const value=kind==="video"?`/storage/v1/object/public/guide-media/${path}`:path;
  await rest(`guide_steps?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({[kind==="video"?"video_url":"image_path"]:value})},true);
  return NextResponse.json({ok:true,path});
 }catch(e:any){return NextResponse.json({error:e.message||"Upload failed."},{status:500})}
}