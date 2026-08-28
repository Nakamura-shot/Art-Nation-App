import {redirect} from "next/navigation";
import AdminShell from "@/components/AdminShell";
import AdminCustomersTable from "@/components/AdminCustomersTable";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
export default async function Page(){
 if(!(await getAdminUser()))redirect("/admin/login");
 const rows=await rest<any[]>(`customers?select=id,full_name,email,phone,portal_token,created_at,messenger_psid,messenger_connected_at,messenger_transactional_opt_in,messenger_marketing_opt_in,orders(id,total,status,bookings(id,quantity,status,created_at,event_sessions(starts_at,events(title),locations(name)))),customer_guide_access(guide_id,guides(title))&order=created_at.desc`,{},true);
 return <AdminShell active="Customers"><header className="admin-topbar"><div><h1>Customers</h1><p>Search customer history by venue, event and date.</p></div></header><main className="admin-content"><AdminCustomersTable rows={rows}/></main></AdminShell>
}