import {notFound,redirect} from "next/navigation";
import {rest} from "@/lib/supabase-rest";
export default async function Page({params}:{params:Promise<{code:string}>}){
 const {code}=await params;const normalized=code.toUpperCase();
 const rows=await rest<any[]>(`event_guide_access_codes?select=id,code,starts_at,expires_at,active,guides!inner(slug)&code=eq.${encodeURIComponent(normalized)}&limit=1`,{},true);
 const c=rows[0];if(!c)return notFound();const now=new Date();
 if(!c.active||(c.starts_at&&now<new Date(c.starts_at))||now>new Date(c.expires_at))redirect(`/event-access/${normalized}/status`);
 redirect(`/guides/${c.guides.slug}?event=${encodeURIComponent(normalized)}`);
}