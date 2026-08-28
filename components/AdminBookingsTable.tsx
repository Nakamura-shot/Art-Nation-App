"use client";
import {useMemo,useState} from "react";
import AdminBookingActions from "@/components/AdminBookingActions";

function money(v:number|string){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(Number(v))}
function dateOnly(v:string){return new Date(v).toISOString().slice(0,10)}

export default function AdminBookingsTable({rows}:{rows:any[]}){
 const [q,setQ]=useState(""),[location,setLocation]=useState(""),[event,setEvent]=useState(""),[status,setStatus]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
 const locations=useMemo(()=>Array.from(new Set(rows.map(r=>r.event_sessions.locations.name))).sort(),[rows]);
 const events=useMemo(()=>Array.from(new Set(rows.map(r=>r.event_sessions.events.title))).sort(),[rows]);
 const filtered=useMemo(()=>rows.filter(r=>{
  const hay=`${r.reference||""} ${r.orders.customers.full_name||""} ${r.orders.customers.email||""} ${r.orders.customers.phone||""}`.toLowerCase();
  const d=dateOnly(r.event_sessions.starts_at);
  return (!q||hay.includes(q.toLowerCase()))
   &&(!location||r.event_sessions.locations.name===location)
   &&(!event||r.event_sessions.events.title===event)
   &&(!status||r.status===status)
   &&(!from||d>=from)&&(!to||d<=to);
 }),[rows,q,location,event,status,from,to]);
 const totalPax=filtered.reduce((n,r)=>n+Number(r.quantity||0),0);
 const totalValue=filtered.reduce((n,r)=>n+Number(r.orders.total||0),0);
 function clear(){setQ("");setLocation("");setEvent("");setStatus("");setFrom("");setTo("")}
 return <>
  <section className="admin-filter-card">
   <div className="filter-row filter-search"><label>Search<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Name, email, phone or booking ref..."/></label></div>
   <div className="filter-row">
    <label>Location<select value={location} onChange={e=>setLocation(e.target.value)}><option value="">All locations</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Event<select value={event} onChange={e=>setEvent(e.target.value)}><option value="">All events</option>{events.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="payment_pending">Payment review</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></label>
    <label>Event date from<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
    <button className="filter-clear" onClick={clear}>Clear filters</button>
   </div>
   <div className="filter-summary"><b>{filtered.length}</b> bookings <span>·</span> <b>{totalPax}</b> participants <span>·</span> <b>{money(totalValue)}</b> booking value</div>
  </section>
  <div className="modern-table-card"><table className="modern-table"><thead><tr><th>Booking</th><th>Customer</th><th>Event</th><th>Event date</th><th>Pax</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
   {filtered.map(row=>{const confirmed=row.status==="confirmed";return <tr key={row.id}>
    <td><b>{row.reference||row.id.slice(0,8).toUpperCase()}</b><small>Booked {new Date(row.created_at).toLocaleDateString()}</small></td>
    <td><b>{row.orders.customers.full_name}</b><small>{row.orders.customers.email||row.orders.customers.phone}</small></td>
    <td><b>{row.event_sessions.events.title}</b><small>{row.event_sessions.locations.name}</small></td>
    <td><b>{new Date(row.event_sessions.starts_at).toLocaleDateString()}</b><small>{new Date(row.event_sessions.starts_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</small></td>
    <td>{row.quantity}</td><td><b>{money(row.orders.total)}</b></td>
    <td><span className={`event-status ${confirmed?"published":row.status==="cancelled"?"draft":"pending"}`}>{confirmed?"Confirmed":row.status==="cancelled"?"Cancelled":"Payment review"}</span></td>
    <td><div className="event-action-row">{row.receiptUrl&&<a className="mini-button" href={row.receiptUrl} target="_blank">Receipt</a>}<AdminBookingActions id={row.id} confirmed={confirmed}/><a className="mini-button" href={`/admin/communications?customer=${row.orders.customer_id}&booking=${row.id}`}>Message</a><a className="mini-button" href={`/admin/email?customer=${row.orders.customer_id}`}>Email</a></div></td>
   </tr>})}
   {!filtered.length&&<tr><td colSpan={8}><div className="table-empty">No bookings match these filters.</div></td></tr>}
  </tbody></table></div>
 </>;
}