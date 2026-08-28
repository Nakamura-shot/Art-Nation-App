"use client";
import {useMemo,useState} from "react";

export default function AdminCustomersTable({rows}:{rows:any[]}){
 const [q,setQ]=useState(""),[location,setLocation]=useState(""),[event,setEvent]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState(""),[booked,setBooked]=useState(""),[messenger,setMessenger]=useState("");
 const allBookings=useMemo(()=>rows.flatMap(c=>(c.orders||[]).flatMap((o:any)=>(o.bookings||[]).map((b:any)=>({...b,customerId:c.id})))),[rows]);
 const locations=useMemo(()=>Array.from(new Set(allBookings.map((b:any)=>b.event_sessions?.locations?.name).filter(Boolean))).sort(),[allBookings]);
 const events=useMemo(()=>Array.from(new Set(allBookings.map((b:any)=>b.event_sessions?.events?.title).filter(Boolean))).sort(),[allBookings]);
 const filtered=useMemo(()=>rows.filter(c=>{
   const hay=`${c.full_name||""} ${c.email||""} ${c.phone||""}`.toLowerCase();
   const bookings=(c.orders||[]).flatMap((o:any)=>o.bookings||[]);
   const matching=bookings.filter((b:any)=>{
    const d=b.event_sessions?.starts_at?new Date(b.event_sessions.starts_at).toISOString().slice(0,10):"";
    return (!location||b.event_sessions?.locations?.name===location)
      &&(!event||b.event_sessions?.events?.title===event)
      &&(!from||d>=from)&&(!to||d<=to);
   });
   const noBookingFilters=!location&&!event&&!from&&!to;
   return (!q||hay.includes(q.toLowerCase()))
     &&(noBookingFilters||matching.length>0)
     &&(!booked||(booked==="yes"?bookings.length>0:bookings.length===0))
     &&(!messenger||(messenger==="connected"?!!c.messenger_psid:messenger==="marketing"?!!c.messenger_marketing_opt_in:!c.messenger_psid));
 }),[rows,q,location,event,from,to,booked]);
 function clear(){setQ("");setLocation("");setEvent("");setFrom("");setTo("");setBooked("");setMessenger("")}
 return <>
  <section className="admin-filter-card">
   <div className="filter-row filter-search"><label>Search customers<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Name, email or phone..."/></label></div>
   <div className="filter-row">
    <label>Booked at location<select value={location} onChange={e=>setLocation(e.target.value)}><option value="">All locations</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Booked event<select value={event} onChange={e=>setEvent(e.target.value)}><option value="">All events</option>{events.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Booking history<select value={booked} onChange={e=>setBooked(e.target.value)}><option value="">Any</option><option value="yes">Has bookings</option><option value="no">No bookings</option></select></label>
    <label>Messenger<select value={messenger} onChange={e=>setMessenger(e.target.value)}><option value="">Any</option><option value="connected">Connected</option><option value="marketing">Marketing opt-in</option><option value="not_connected">Not connected</option></select></label>
    <label>Event date from<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
    <button className="filter-clear" onClick={clear}>Clear filters</button>
   </div>
   <div className="filter-summary"><b>{filtered.length}</b> customers shown</div>
  </section>
  <div className="modern-table-card"><table className="modern-table"><thead><tr><th>Customer</th><th>Contact</th><th>Bookings</th><th>Last event</th><th>Guides</th><th>Messenger</th><th>Portal</th><th>Message</th></tr></thead><tbody>
   {filtered.map(c=>{const bs=(c.orders||[]).flatMap((o:any)=>o.bookings||[]).filter((b:any)=>b.event_sessions);const latest=[...bs].sort((a:any,b:any)=>new Date(b.event_sessions.starts_at).getTime()-new Date(a.event_sessions.starts_at).getTime())[0];return <tr key={c.id}>
    <td><b>{c.full_name}</b><small>Customer since {new Date(c.created_at).toLocaleDateString()}</small></td>
    <td>{c.email||"—"}<small>{c.phone||""}</small></td>
    <td><b>{bs.length}</b><small>{bs.reduce((n:number,b:any)=>n+Number(b.quantity||0),0)} participants booked</small></td>
    <td>{latest?<><b>{latest.event_sessions.events.title}</b><small>{latest.event_sessions.locations.name} · {new Date(latest.event_sessions.starts_at).toLocaleDateString()}</small></>:"—"}</td>
    <td>{c.customer_guide_access?.length||0}<small>{(c.customer_guide_access||[]).map((a:any)=>a.guides?.title).filter(Boolean).join(", ")}</small></td>
    <td>{c.messenger_psid?<><span className="messenger-status connected">Connected</span><small>{c.messenger_marketing_opt_in?"Deals + updates":"Service updates"}</small></>:c.messenger_transactional_opt_in?<><span className="messenger-status pending">Opted in</span><small>Connection not finished</small></>:<span className="messenger-status off">Not connected</span>}</td><td>{c.portal_token?<a className="mini-button" href={`/my-guides/${c.portal_token}`} target="_blank">Open My Guides</a>:"—"}</td><td><div className="event-action-row"><a className="mini-button" href={`/admin/communications?customer=${c.id}`}>Messenger</a>{c.email&&<a className="mini-button" href={`/admin/email?customer=${c.id}`}>Email</a>}</div></td>
   </tr>})}
   {!filtered.length&&<tr><td colSpan={8}><div className="table-empty">No customers match these filters.</div></td></tr>}
  </tbody></table></div>
 </>;
}