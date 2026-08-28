import {redirect} from "next/navigation";
import AdminShell from "@/components/AdminShell";
import AdminBookingsTable from "@/components/AdminBookingsTable";
import {getAdminUser} from "@/lib/admin-auth";
import {isSupabaseConfigured,rest,signedReceiptUrl} from "@/lib/supabase-rest";
export default async function AdminBookings(){
 if(!isSupabaseConfigured()||!(await getAdminUser()))redirect("/admin/login");
 const rows=await rest<any[]>(`bookings?select=id,reference,quantity,status,created_at,orders!inner(customer_id,total,customers!inner(full_name,email,phone),payments(method,status,receipt_path)),event_sessions!inner(starts_at,events!inner(title),locations!inner(name))&order=created_at.desc`,{},true);
 const hydrated=await Promise.all(rows.map(async row=>{const payment=row.orders.payments?.[0];return {...row,receiptUrl:payment?.receipt_path?await signedReceiptUrl(payment.receipt_path):null}}));
 return <AdminShell active="Bookings"><header className="admin-topbar"><div><h1>Bookings</h1><p>Search, filter and manage reservations.</p></div></header><main className="admin-content"><AdminBookingsTable rows={hydrated}/></main></AdminShell>
}