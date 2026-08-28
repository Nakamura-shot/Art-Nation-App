import {redirect} from "next/navigation";
import AdminShell from "@/components/AdminShell";
import AdminEmailClient from "@/components/AdminEmailClient";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";
import {configured,emailConfig} from "@/lib/email-server";

export default async function Page({searchParams}:{searchParams:Promise<{customer?:string;booking?:string}>}){
 if(!(await getAdminUser()))redirect("/admin/login");const sp=await searchParams;
 const [customers,bookings,templates]=await Promise.all([
  rest<any[]>(`customers?select=id,full_name,email,phone,portal_token&order=full_name.asc`,{},true),
  rest<any[]>(`bookings?select=id,reference,quantity,status,orders!inner(customer_id),event_sessions!inner(starts_at,events!inner(title),locations!inner(name))&order=created_at.desc`,{},true),
  rest<any[]>(`communication_templates?select=id,name,channel,category,subject,body,active&channel=eq.email&order=category,name`,{},true)
 ]);
 let account:any=null;
 if(configured()){const c=emailConfig();account={email:c.fromAddress,name:c.fromName,imapHost:c.imapHost,smtpHost:c.smtpHost}}
 return <AdminShell active="Email"><header className="admin-topbar"><div><h1>Email</h1><p>Read, reply and send from hello@artnation.ph.</p></div></header><main className="admin-content"><AdminEmailClient account={account} customers={customers} bookings={bookings} templates={templates} initialCustomer={sp.customer} initialBooking={sp.booking}/></main></AdminShell>
}