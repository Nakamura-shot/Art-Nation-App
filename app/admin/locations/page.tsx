import {redirect} from "next/navigation";
import AdminShell from "@/components/AdminShell";
import LocationsManager from "@/components/LocationsManager";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export default async function Page(){
 if(!(await getAdminUser()))redirect("/admin/login");
 const [locations,templates]=await Promise.all([
  rest<any[]>(`locations?select=id,name,slug,address,public_description,image_path,website_url,opening_hours,contact_name,phone,email,notes,capacity_notes,maps_url,active,default_form_template_id,form_templates(name),location_menu_items(id,name,description,price,image_path,category,sort_order,active)&order=active.desc,name.asc`,{},true),
  rest<any[]>(`form_templates?select=id,name,is_default&order=is_default.desc,name.asc`,{},true)
 ]);
 const publicBase=(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");
 return <AdminShell active="Locations">
  <header className="admin-topbar"><div><h1>Locations</h1><p>Manage Art Nation Cebu and partner venues.</p></div></header>
  <main className="admin-content"><LocationsManager initial={locations} templates={templates} publicBase={publicBase}/></main>
 </AdminShell>
}