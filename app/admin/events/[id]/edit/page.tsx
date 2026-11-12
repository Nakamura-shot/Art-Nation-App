import {redirect,notFound} from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AdminEventForm,{EventFormInitial} from "@/components/AdminEventForm";
import {getAdminUser} from "@/lib/admin-auth";
import {rest,publicEventCoverUrl} from "@/lib/supabase-rest";

function datePart(v:string){
 const d=new Date(v);
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}
function timePart(v:string){
 return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Manila",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v));
}
function localDateTime(v:string|null){
 if(!v)return "";
 const d=new Date(v);
 const date=datePart(v),time=timePart(v);
 return `${date}T${time}`;
}

export default async function Page({params}:{params:Promise<{id:string}>}){
 if(!(await getAdminUser()))redirect("/admin/login");
 const {id}=await params;
 const [rows,locations,eventTypes,guides,services,artworks,teachers]=await Promise.all([
  rest<any[]>(`event_sessions?select=id,event_id,location_id,service_id,artwork_id,starts_at,ends_at,capacity,regular_price,early_bird_price,early_bird_until,events!inner(id,title,description,event_type_id,guide_id,artwork_id,cover_image_path),form_fields(label,field_key,field_type,required,options,sort_order)&id=eq.${id}&limit=1`,{},true),
  rest<any[]>("locations?select=id,name,default_form_template_id&active=eq.true&order=name",{},true),
  rest<any[]>("event_types?select=id,name&order=name",{},true),
  rest<any[]>("guides?select=id,title&active=eq.true&order=title",{},true),
  rest<any[]>("services?select=id,name,active,default_duration_minutes,default_price,default_capacity&order=name",{},true),
  rest<any[]>("artworks?select=id,title,active,cover_image_path&order=title",{},true)
  ,rest<any[]>("teachers?select=id,full_name,engagement_type,active,can_lead,profile_image_path,teacher_capability_links(teacher_capabilities(name)),teacher_availability(day_of_week,start_time,end_time)&active=eq.true&order=full_name",{},true).catch(()=>[])
 ]);
 const s=rows[0]; if(!s)return notFound();

 const initial:EventFormInitial={
  sessionId:s.id,eventId:s.event_id,title:s.events.title,description:s.events.description||"",
  eventTypeId:s.events.event_type_id,locationId:s.location_id,serviceId:s.service_id,artworkId:s.artwork_id||s.events.artwork_id,guideId:s.events.guide_id,date:datePart(s.starts_at),
  startTime:timePart(s.starts_at),endTime:timePart(s.ends_at),capacity:Number(s.capacity),
  regularPrice:Number(s.regular_price),earlyBirdPrice:s.early_bird_price==null?null:Number(s.early_bird_price),
  earlyBirdUntil:localDateTime(s.early_bird_until),coverUrl:publicEventCoverUrl(s.events.cover_image_path),
  fields:[...(s.form_fields||[])].sort((a:any,b:any)=>a.sort_order-b.sort_order).map((f:any)=>({
    label:f.label,field_key:f.field_key,field_type:f.field_type,required:f.required,
    options:Array.isArray(f.options)?f.options.join(", "):""
  }))
 };

 return <AdminShell active="Events">
   <header className="admin-topbar"><div><h1>Edit event</h1><p>Update the event without affecting existing bookings.</p></div><Link className="secondary-button" href="/admin/events">Cancel</Link></header>
   <main className="admin-content event-editor-page"><AdminEventForm meta={{locations,eventTypes,guides,services,artworks,teachers}} initial={initial}/></main>
 </AdminShell>
}
