
import {redirect} from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AdminEventActions from "@/components/AdminEventActions";
import {getAdminUser} from "@/lib/admin-auth";
import {rest,publicEventCoverUrl} from "@/lib/supabase-rest";

function money(v:any){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(Number(v))}

export default async function Page(){
 if(!(await getAdminUser())) redirect("/admin/login");
 const rows=await rest<any[]>(`event_sessions?select=id,starts_at,ends_at,capacity,regular_price,early_bird_price,active,events!inner(id,title,slug,cover_image_path),locations!inner(name),bookings(quantity,status)&order=starts_at.desc`,{},true);

 return <AdminShell active="Events">
  <header className="admin-topbar"><div><h1>Events</h1><p>Create, publish and manage Art Nation sessions.</p></div><Link className="create-button" href="/admin/events/new">＋ Create event</Link></header>
  <main className="admin-content">
   <div className="list-toolbar"><div><b>{rows.length} sessions</b><span>Manage upcoming and past events</span></div><Link href="/admin">← Dashboard</Link></div>
   <div className="modern-table-card"><table className="modern-table">
    <thead><tr><th>Event</th><th>Date & venue</th><th>Bookings</th><th>Pricing</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>{rows.map(r=>{
      const booked=(r.bookings||[]).filter((x:any)=>x.status!=="cancelled").reduce((n:number,x:any)=>n+x.quantity,0);
      const pct=Math.min(100,Math.round(booked/r.capacity*100));
      const cover=publicEventCoverUrl(r.events.cover_image_path);
      return <tr key={r.id}>
       <td><div className="table-event">
        <span className={`event-list-thumb ${cover?"with-cover":""}`}>{cover?<img src={cover} alt={r.events.title}/>:"🎨"}</span>
        <div><b>{r.events.title}</b><small>/events/{r.events.slug}</small></div>
       </div></td>
       <td><b>{new Date(r.starts_at).toLocaleDateString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric"})}</b><small>{r.locations.name}</small></td>
       <td><b>{booked} / {r.capacity}</b><div className="progress small"><i style={{width:`${pct}%`}}/></div></td>
       <td>{r.early_bird_price?<><b>{money(r.early_bird_price)}</b><small>Early / {money(r.regular_price)} regular</small></>:<b>{money(r.regular_price)}</b>}</td>
       <td><span className={`event-status ${r.active?"published":"draft"}`}>{r.active?"Published":"Hidden"}</span></td>
       <td><AdminEventActions id={r.id} active={r.active} slug={r.events.slug}/></td>
      </tr>
    })}</tbody>
   </table></div>
  </main>
 </AdminShell>
}
