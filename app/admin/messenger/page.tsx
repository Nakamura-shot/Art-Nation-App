import {redirect} from "next/navigation";
import AdminShell from "@/components/AdminShell";
import MessengerInbox from "@/components/MessengerInbox";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

export default async function Page(){
 if(!(await getAdminUser()))redirect("/admin/login");
 const [customers,messages,templates]=await Promise.all([
  rest<any[]>(`customers?select=id,full_name,email,phone,messenger_psid,messenger_connected_at,messenger_transactional_opt_in,messenger_marketing_opt_in&messenger_psid=not.is.null&order=full_name.asc`,{},true),
  rest<any[]>(`messenger_messages?select=id,customer_id,psid,direction,message_type,body,status,read_at,created_at&order=created_at.desc&limit=500`,{},true),
  rest<any[]>(`communication_templates?select=id,name,channel,category,body,active&channel=eq.messenger&active=eq.true&order=category,name`,{},true)
 ]);
 return <AdminShell active="Messenger"><header className="admin-topbar"><div><h1>Messenger</h1><p>Receive customer messages and reply from Art Nation.</p></div></header><main className="admin-content"><MessengerInbox customers={customers} initialMessages={messages} templates={templates}/></main></AdminShell>
}
