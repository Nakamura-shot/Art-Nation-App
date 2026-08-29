"use client";
import {useEffect,useState} from "react";

type SavedParticipant={id:string;full_name:string;is_child:boolean;age:number|null;linked_customer_id?:string|null};
type AccountData={loggedIn:boolean;customer?:any;savedParticipants?:SavedParticipant[];orders?:any[]};

export default function AccountClient(){
 const [data,setData]=useState<AccountData|null>(null); const [email,setEmail]=useState(""); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 const [name,setName]=useState(""); const [phone,setPhone]=useState("");
 async function load(){const r=await fetch("/api/account/me",{cache:"no-store"});const d=await r.json();setData(d);if(d.customer){setName(d.customer.full_name||"");setPhone(d.customer.phone||"")}}
 useEffect(()=>{load()},[]);
 async function sendLink(){setBusy(true);setError("");const r=await fetch("/api/account/magic-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const d=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setError(d.error||"Could not send login email.");return}setSent(true)}
 async function save(){setBusy(true);setError("");const r=await fetch("/api/account/me",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name,phone})});const d=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setError(d.error||"Could not save.");return}await load()}
 async function logout(){await fetch("/api/account/logout",{method:"POST"});location.reload()}
 if(!data)return <div className="account-card">Loading…</div>;
 if(!data.loggedIn)return <div className="account-card account-login-card"><span className="eyebrow">MY ART NATION</span><h1>Make your next booking faster</h1><p>Log in with your email to remember your contact details and people you have booked for before.</p>{sent?<div className="notice"><b>Check your email.</b><br/>Open the Art Nation login link on this device to continue.</div>:<><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><button className="create-button" disabled={busy||!email} onClick={sendLink}>{busy?"Sending…":"Email me a login link"}</button></>}{error&&<div className="error-box">{error}</div>}</div>;
 const saved=data.savedParticipants||[]; const orders=data.orders||[];
 return <div className="account-grid">
  <section className="account-card"><div className="account-card-head"><div><span className="eyebrow">MY DETAILS</span><h2>{data.customer?.full_name}</h2></div><button className="mini-button" onClick={logout}>Log out</button></div><label>Full name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Email<input value={data.customer?.email||""} readOnly/></label><label>Mobile number<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="create-button" disabled={busy} onClick={save}>Save details</button>{data.customer?.messenger_connected_at&&<div className="account-connected">✓ Messenger connected</div>}{error&&<div className="error-box">{error}</div>}</section>
  <section className="account-card"><span className="eyebrow">MY PARTICIPANTS</span><h2>People you book for</h2><p className="account-help">These are remembered automatically from previous bookings.</p>{saved.length?saved.map(p=><div className="saved-person-row" key={p.id}><div><b>{p.full_name}</b><small>{p.is_child?`Child${p.age?`, age ${p.age}`:""}`:"Adult"}</small></div>{p.linked_customer_id&&<span>Own profile linked</span>}</div>):<div className="empty-state">No saved participants yet.</div>}</section>
  <section className="account-card account-bookings"><span className="eyebrow">MY BOOKINGS</span><h2>Recent bookings</h2>{orders.length?orders.flatMap((o:any)=>(o.bookings||[]).map((b:any)=><div className="account-booking-row" key={b.id}><div><b>{b.event_sessions?.events?.title||"Art Nation booking"}</b><small>{b.event_sessions?.starts_at?new Date(b.event_sessions.starts_at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}):""} · {b.quantity} participant(s)</small></div><span>{b.reference||b.id.slice(0,8).toUpperCase()}</span></div>)):<div className="empty-state">No bookings found yet.</div>}</section>
 </div>
}
