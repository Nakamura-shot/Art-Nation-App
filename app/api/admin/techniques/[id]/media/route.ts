import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest,uploadTechniqueMedia} from "@/lib/supabase-rest";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const fd=await req.formData();const file=fd.get("file");const kind=String(fd.get("kind")||"image");
  if(!(file instanceof File))return NextResponse.json({error:"Choose a file."},{status:400});
  if(file.size>25*1024*1024)return NextResponse.json({error:"Media must be under 25 MB."},{status:400});
  const ext=(file.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"");const path=`${id}/${kind}-${Date.now()}.${ext}`;
  await uploadTechniqueMedia(path,file);
  await rest(`techniques?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({[kind==="video"?"video_url":"image_path"]:kind==="video"?`/storage/v1/object/public/technique-media/${path}`:path})},true);
  return NextResponse.json({ok:true,path});
 }catch(e:any){return NextResponse.json({error:e.message||"Upload failed."},{status:500})}
}