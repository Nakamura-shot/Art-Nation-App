import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest,uploadMenuImage} from "@/lib/supabase-rest";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;const fd=await req.formData();
  const name=String(fd.get("name")||"").trim(); if(!name)return NextResponse.json({error:"Menu item name is required."},{status:400});
  const priceRaw=String(fd.get("price")||"").trim(); const file=fd.get("file");
  let image_path:string|null=null;
  const rows=await rest<any[]>("location_menu_items",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({
   location_id:id,name,description:String(fd.get("description")||"")||null,price:priceRaw?Number(priceRaw):null,
   category:String(fd.get("category")||"")||null,sort_order:Number(fd.get("sort_order")||0),active:true
  })},true);
  if(file instanceof File && file.size){
   if(!file.type.startsWith("image/"))return NextResponse.json({error:"Menu photo must be an image."},{status:400});
   const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"");
   image_path=`${id}/${rows[0].id}-${Date.now()}.${ext}`;
   await uploadMenuImage(image_path,file);
   await rest(`location_menu_items?id=eq.${rows[0].id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({image_path})},true);
  }
  return NextResponse.json({ok:true});
 }catch(e:any){console.error("MENU_ITEM_ERROR",e);return NextResponse.json({error:e.message||"Could not add menu item."},{status:500})}
}