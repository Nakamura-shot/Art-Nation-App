import {redirect} from "next/navigation";
import AdminShell from "@/components/AdminShell";
import CommunicationsManager from "@/components/CommunicationsManager";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export default async function Page({searchParams}:{searchParams:Promise<{customer?:string;booking?:string}>}){
 if(!(await getAdminUser()))redirect("/admin/login");
 const sp=await searchParams;
 const [customers,bookings,templates,logs]=await Promise.all([
  rest<any[]>(`customers?select=id,full_name,email,phone,portal_token,messenger_name,messenger_url,messenger_psid,messenger_connected_at,messenger_transactional_opt_in,messenger_marketing_opt_in&order=full_name.asc`,{},true),
  rest<any[]>(`bookings?select=id,reference,quantity,status,orders!inner(customer_id),event_sessions!inner(starts_at,events!inner(title),locations!inner(name))&order=created_at.desc`,{},true),
  rest<any[]>(`communication_templates?select=id,name,channel,category,body,active&order=category,name`,{},true),
  rest<any[]>(`communication_log?select=id,channel,message_body,status,sent_at,created_at,customers(full_name)&order=created_at.desc&limit=50`,{},true)
 ]);
 return <AdminShell active="Communications"><header className="admin-topbar"><div><h1>Communications</h1><p>Prepare, personalize and track customer messages.</p></div></header><main className="admin-content"><CommunicationsManager customers={customers} bookings={bookings} templates={templates} logs={logs} initialCustomer={sp.customer} initialBooking={sp.booking}/></main></AdminShell>
}