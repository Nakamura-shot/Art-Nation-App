import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {publicHeaders,supabaseUrl} from "@/lib/supabase-rest";

export async function POST(request:Request){
 try{
  const {email,password}=await request.json();
  const response=await fetch(supabaseUrl("/auth/v1/token?grant_type=password"),{
   method:"POST",
   headers:{...publicHeaders(),"Content-Type":"application/json"},
   body:JSON.stringify({email,password}),
   cache:"no-store"
  });
  const result=await response.json();
  if(!response.ok)return NextResponse.json({error:"Invalid email or password."},{status:401});

  const store=await cookies();
  store.set("artnation_admin_token",result.access_token,{
   httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",
   maxAge:result.expires_in||3600,path:"/"
  });
  if(result.refresh_token){
   store.set("artnation_admin_refresh",result.refresh_token,{
    httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",
    maxAge:60*60*24*30,path:"/"
   });
  }
  return NextResponse.json({ok:true});
 }catch{
  return NextResponse.json({error:"Admin login is not configured yet."},{status:503});
 }
}