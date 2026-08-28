
import {redirect} from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AdminEventForm from "@/components/AdminEventForm";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export default async function Page(){
 if(!(await getAdminUser()))redirect("/admin/login");
 const [locations,eventTypes,guides]=await Promise.all([rest<any[]>("locations?select=id,name,default_form_template_id&active=eq.true&order=name",{},true),rest<any[]>("event_types?select=id,name&order=name",{},true),rest<any[]>("guides?select=id,title&active=eq.true&order=title",{},true)]);
 return <AdminShell active="Create event">
   <header className="admin-topbar"><div><h1>Create event</h1><p>Build the session, pricing and participant form in one place.</p></div><Link className="secondary-button" href="/admin/events">Cancel</Link></header>
   <main className="admin-content event-editor-page">
     <AdminEventForm meta={{locations,eventTypes,guides}}/>
   </main>
 </AdminShell>
}
