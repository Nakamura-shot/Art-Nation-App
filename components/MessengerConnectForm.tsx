"use client";
import {useState} from "react";

export default function MessengerConnectForm({customerId,bookingId,compact=false}:{customerId?:string;bookingId?:string;compact?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[needsMeta,setNeedsMeta]=useState(false),[marketing,setMarketing]=useState(false);
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState("");

 async function connect(){
  if(!customerId&&!name.trim()){setError("Your name is required.");return}
  setBusy(true);setError("");setNeedsMeta(false);
  const body:any={
   customer_id:customerId||undefined,booking_id:bookingId||undefined,
   name:name||undefined,email:email||undefined,phone:phone||undefined,
   transactional_opt_in:true,marketing_opt_in:marketing,
   source:bookingId?"booking_confirmation":"website"
  };
  const r=await fetch("/api/messenger/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok){setError(d.error||"Could not connect Messenger.");return}
  if(!d.connectUrl){setNeedsMeta(true);return}
  window.location.href=d.connectUrl;
 }

 return <div className={`messenger-connect-form ${compact?"compact":""}`}>
  {!compact&&<><span className="eyebrow">MESSENGER UPDATES</span><h1>Stay connected with Art Nation</h1><p>Connect Messenger for booking updates, event reminders and — if you choose — special offers from Art Nation Cebu.</p></>}
  {!customerId&&!compact&&<div className="messenger-public-fields">
   <label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>
   <label>Email <span>(optional)</span><input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label>
   <label>Mobile <span>(optional)</span><input value={phone} onChange={e=>setPhone(e.target.value)}/></label>
  </div>}
  <label className="messenger-consent required-consent"><input type="checkbox" checked readOnly/> Send me service messages such as booking confirmations, payment updates and event reminders on Messenger.</label>
  <label className="messenger-consent"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> I’d also like occasional Art Nation special offers, new workshops and promotions on Messenger.</label>
  <small className="messenger-consent-note">You can opt out of promotional communications later. Connecting Messenger does not guarantee that Meta permits every type of message at all times.</small>
  <button type="button" className="messenger-connect-button" disabled={busy} onClick={connect}>{busy?"Connecting…":"Continue in Messenger"}</button>
  {error&&<div className="error-box">{error}</div>}
  {needsMeta&&<div className="notice">Messenger updates are not available yet. Please use email or contact Art Nation Cebu through Facebook for assistance.</div>}
 </div>;
}
