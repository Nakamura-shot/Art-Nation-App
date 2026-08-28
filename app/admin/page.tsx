
import {redirect} from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import {getAdminUser} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

function money(v:number){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(v)}
function fmtDate(v:string){return new Date(v).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}
function initials(name:string){return name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}

export default async function Dashboard(){
 if(!(await getAdminUser())) redirect("/admin/login");
 const now=new Date();
 const future=new Date(now.getTime()+30*24*60*60*1000).toISOString();
 const [sessions,bookings] = await Promise.all([
  rest<any[]>(`event_sessions?select=id,starts_at,ends_at,capacity,regular_price,early_bird_price,active,events!inner(title,slug),locations!inner(name),bookings(quantity,status)&starts_at=gte.${encodeURIComponent(now.toISOString())}&starts_at=lte.${encodeURIComponent(future)}&order=starts_at.asc`,{},true),
  rest<any[]>(`bookings?select=id,quantity,status,created_at,unit_price,orders!inner(total,customers!inner(full_name),payments(status)),event_sessions!inner(events!inner(title))&order=created_at.desc&limit=6`,{},true)
 ]);
 const upcoming=sessions.length;
 const totalBookings=sessions.reduce((n,s)=>n+(s.bookings||[]).filter((b:any)=>b.status!=="cancelled").reduce((a:number,b:any)=>a+b.quantity,0),0);
 const capacity=sessions.reduce((n,s)=>n+Number(s.capacity||0),0);
 const capacityPct=capacity?Math.round(totalBookings/capacity*100):0;
 const revenue=bookings.reduce((n,b)=>{
   const paid=(b.orders?.payments||[]).some((p:any)=>["confirmed","paid","verified"].includes(String(p.status).toLowerCase()));
   return n+(paid?Number(b.orders?.total||0):0);
 },0);
 const top=sessions.slice(0,5);
 const maxBooked=Math.max(1,...top.map(s=>(s.bookings||[]).filter((b:any)=>b.status!=="cancelled").reduce((a:number,b:any)=>a+b.quantity,0)));

 return <AdminShell active="Dashboard">
  <header className="admin-topbar">
   <div><h1>Good morning 👋</h1><p>Here’s what’s happening at Art Nation Cebu.</p></div>
   <div className="topbar-actions"><Link className="create-button" href="/admin/events/new">＋ Create event</Link><div className="admin-profile"><span>AN</span><div><b>Art Nation</b><small>Admin</small></div></div></div>
  </header>
  <main className="admin-content">
   <section className="metric-grid">
    <div className="metric-card"><div><span>Upcoming events</span><strong>{upcoming}</strong><small>Next 30 days</small></div><i>▣</i></div>
    <div className="metric-card"><div><span>Total bookings</span><strong>{totalBookings}</strong><small>Across upcoming events</small></div><i>♧</i></div>
    <div className="metric-card"><div><span>Confirmed revenue</span><strong>{money(revenue)}</strong><small>Recent confirmed payments</small></div><i>₱</i></div>
    <div className="metric-card"><div><span>Capacity sold</span><strong>{capacityPct}%</strong><small>Across upcoming events</small></div><i>◔</i></div>
   </section>

   <section className="dashboard-grid">
    <div className="dash-card span-7">
      <div className="dash-card-head"><div><h2>Upcoming events</h2><p>Your next Art Nation sessions</p></div><Link href="/admin/events">View all</Link></div>
      <div className="upcoming-list">{top.length?top.map(s=>{const booked=(s.bookings||[]).filter((b:any)=>b.status!=="cancelled").reduce((a:number,b:any)=>a+b.quantity,0);const pct=Math.min(100,Math.round(booked/s.capacity*100));return <div className="upcoming-row" key={s.id}>
        <div className="event-thumb">🎨</div>
        <div className="event-main"><b>{s.events.title}</b><span>{fmtDate(s.starts_at)}</span><span>{s.locations.name}</span></div>
        <div className="event-cap"><b>{booked} / {s.capacity}</b><span>{pct}% sold</span><div className="progress"><i style={{width:`${pct}%`}}/></div></div>
        <span className={`event-status ${s.active?"published":"draft"}`}>{s.active?"Published":"Draft"}</span>
        <Link className="dots" href="/admin/events">•••</Link>
      </div>}):<div className="empty-state">No upcoming events yet. <Link href="/admin/events/new">Create your first event.</Link></div>}</div>
    </div>

    <div className="dash-card span-5">
      <div className="dash-card-head"><div><h2>Recent bookings</h2><p>Latest customer activity</p></div><Link href="/admin/bookings">View all</Link></div>
      <div className="booking-list">{bookings.length?bookings.map((b,i)=><div className="booking-row" key={b.id}>
        <span className={`avatar a${i%4}`}>{initials(b.orders.customers.full_name)}</span>
        <div><b>{b.orders.customers.full_name}</b><span>{b.event_sessions.events.title}</span></div>
        <span className={`booking-state ${b.status==="confirmed"?"ok":"pending"}`}>{b.status==="confirmed"?"Confirmed":"Pending"}</span>
        <strong>{money(Number(b.orders.total||0))}</strong>
      </div>):<div className="empty-state">No bookings yet.</div>}</div>
    </div>

    <div className="dash-card span-5 quick-card">
      <div className="dash-card-head"><div><h2>Quick actions</h2><p>Common admin tasks</p></div></div>
      <div className="quick-grid">
        <Link href="/admin/events/new">▣ <span>Create event</span></Link>
        <Link href="/admin/events">▤ <span>Duplicate event</span></Link>
        <Link href="/admin/locations">⌖ <span>Manage locations</span></Link>
        <Link href="/admin/events">▧ <span>Event library</span></Link>
        <Link href="/admin/events">⌗ <span>Booking links</span></Link>
        <Link href="/admin/bookings">▥ <span>View bookings</span></Link>
      </div>
    </div>

    <div className="dash-card span-7">
      <div className="dash-card-head"><div><h2>Event performance</h2><p>Bookings for the next 30 days</p></div></div>
      <div className="bar-chart">{top.length?top.map(s=>{const booked=(s.bookings||[]).filter((b:any)=>b.status!=="cancelled").reduce((a:number,b:any)=>a+b.quantity,0);return <div className="bar-item" key={s.id}><div className="bar-label"><span>{s.events.title}</span><b>{booked}</b></div><div className="bar-track"><i style={{width:`${Math.max(4,booked/maxBooked*100)}%`}}/></div></div>}):<div className="empty-state">Performance appears when you have upcoming events.</div>}</div>
    </div>
   </section>
  </main>
 </AdminShell>
}
