
import {redirect} from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AdminEventForm from "@/components/AdminEventForm";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export default async function Page(){
 if(!(await getAdminUser()))redirect("/admin/login");
 const [locations,eventTypes,guides,services,artworks,teachers]=await Promise.all([rest<any[]>("locations?select=id,name,default_form_template_id&active=eq.true&order=name",{},true),rest<any[]>("event_types?select=id,name&order=name",{},true),rest<any[]>("guides?select=id,title&active=eq.true&order=title",{},true),rest<any[]>("services?select=id,name,active,default_duration_minutes,default_price,default_capacity&active=eq.true&order=name",{},true),rest<any[]>("artworks?select=id,title,active,cover_image_path&active=eq.true&order=title",{},true),rest<any[]>("teachers?select=id,full_name,engagement_type,active,can_lead,profile_image_path,teacher_capability_links(teacher_capabilities(name)),teacher_availability(day_of_week,start_time,end_time)&active=eq.true&order=full_name",{},true).catch(()=>[])]);
 return <AdminShell active="Create event">
   <header className="admin-topbar"><div><h1>Create event</h1><p>Build the session, pricing and participant form in one place.</p></div><Link className="secondary-button" href="/admin/events">Cancel</Link></header>
   <main className="admin-content event-editor-page">
     <AdminEventForm meta={{locations,eventTypes,guides,services,artworks,teachers}}/>
   </main>
 </AdminShell>
}
