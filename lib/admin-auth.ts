import {cookies} from "next/headers";
import {publicHeaders,supabaseUrl} from "./supabase-rest";

async function fetchUser(token:string){
 const response=await fetch(supabaseUrl("/auth/v1/user"),{
  headers:{...publicHeaders(),Authorization:`Bearer ${token}`},
  cache:"no-store"
 });
 if(!response.ok)return null;
 return response.json();
}

export async function getAdminUser(){
 const store=await cookies();
 const token=store.get("artnation_admin_token")?.value;
 if(!token)return null;
 return fetchUser(token);
}

export async function getAdminUserWithRefresh(){
 const store=await cookies();
 const access=store.get("artnation_admin_token")?.value;
 if(access){
  const user=await fetchUser(access);
  if(user)return user;
 }
 const refresh=store.get("artnation_admin_refresh")?.value;
 if(!refresh)return null;

 const response=await fetch(supabaseUrl("/auth/v1/token?grant_type=refresh_token"),{
  method:"POST",
  headers:{...publicHeaders(),"Content-Type":"application/json"},
  body:JSON.stringify({refresh_token:refresh}),
  cache:"no-store"
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.access_token)return null;

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
 return fetchUser(result.access_token);
}
