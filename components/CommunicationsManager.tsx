"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

function fmtDate(v?:string){if(!v)return"";return new Date(v).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
function fmtTime(v?:string){if(!v)return"";return new Date(v).toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit"})}
function firstName(name?:string){return String(name||"").trim().split(/\s+/)[0]||"there"}
function render(body:string,c:any,b:any,origin:string){
 const replacements:any={
  first_name:firstName(c?.full_name),full_name:c?.full_name||"",event_title:b?.event_sessions?.events?.title||"",
  booking_reference:b?.reference||"",quantity:b?.quantity||"",location:b?.event_sessions?.locations?.name||"",
  event_date:fmtDate(b?.event_sessions?.starts_at),event_time:fmtTime(b?.event_sessions?.starts_at),
  my_guides_url:c?.portal_token?`${origin}/my-guides/${c.portal_token}`:""
 };
 return body.replace(/\{\{(\w+)\}\}/g,(_,k)=>String(replacements[k]??`{{${k}}}`));
}

export default function CommunicationsManager({customers,bookings,templates,logs,initialCustomer,initialBooking}:{customers:any[];bookings:any[];templates:any[];logs:any[];initialCustomer?:string;initialBooking?:string}){
 const router=useRouter();
 const [customerId,setCustomerId]=useState(initialCustomer||"");
 const [bookingId,setBookingId]=useState(initialBooking||"");
 const [templateId,setTemplateId]=useState("");
 const [channel,setChannel]=useState("messenger");
 const [customBody,setCustomBody]=useState("");
 const [busy,setBusy]=useState(false);
 const [showTemplateForm,setShowTemplateForm]=useState(false);

 const customer=customers.find(c=>c.id===customerId);
 const customerBookings=useMemo(()=>bookings.filter(b=>!customerId||b.orders?.customer_id===customerId),[bookings,customerId]);
 const booking=bookings.find(b=>b.id===bookingId);
 const template=templates.find(t=>t.id===templateId);
 const origin=typeof window!=="undefined"?window.location.origin:"";
 const message=render(customBody||(template?.body||""),customer,booking,origin);
 const messengerTarget=customer?.messenger_url||"https://business.facebook.com/latest/inbox/all";

 function selectTemplate(id:string){setTemplateId(id);const t=templates.find(x=>x.id===id);if(t){setChannel(t.channel);setCustomBody(t.body)}}
 async function saveLog(status:"prepared"|"sent_manual"){
  if(!customerId||!message.trim())return alert("Choose a customer and write a message first.");
  setBusy(true);
  const r=await fetch("/api/admin/communications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
   customer_id:customerId,booking_id:bookingId||null,template_id:templateId||null,channel,
   destination:channel==="messenger"?(customer?.messenger_url||customer?.messenger_name||null):(channel==="email"?customer?.email:customer?.phone),
   message_body:message,status
  })});
  setBusy(false);if(!r.ok){const d=await r.json().catch(()=>({}));alert(d.error||"Could not save communication.");return}
  router.refresh();
 }
 async function copyAndLog(){
  await navigator.clipboard.writeText(message);
  await saveLog("prepared");
  alert("Message copied. Paste it into Messenger.");
 }
 async function markSent(){await saveLog("sent_manual")}
 async function saveMessenger(){
  if(!customerId)return;
  const name=prompt("Messenger display name",customer?.messenger_name||customer?.full_name||"");if(name===null)return;
  const url=prompt("Optional direct Messenger/Facebook chat URL",customer?.messenger_url||"");if(url===null)return;
  const r=await fetch(`/api/admin/customers/${customerId}/messenger`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({messenger_name:name,messenger_url:url})});
  if(!r.ok)return alert("Could not save Messenger details.");router.refresh();
 }
 async function saveTemplate(e:any){
  e.preventDefault();const f=new FormData(e.currentTarget);const r=await fetch("/api/admin/communication-templates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(f.entries()))});
  if(!r.ok){const d=await r.json().catch(()=>({}));return alert(d.error||"Could not save template.");}
  setShowTemplateForm(false);router.refresh();
 }

 return <div className="communications-layout">
  <section className="communications-compose">
   <div className="communications-head"><div><span className="eyebrow">CUSTOMER COMMUNICATIONS</span><h2>Compose message</h2><p>Prepare personalized Messenger messages using booking details automatically.</p></div><button className="secondary-button" onClick={()=>setShowTemplateForm(!showTemplateForm)}>＋ New template</button></div>
   {showTemplateForm&&<form className="template-inline-form" onSubmit={saveTemplate}><div className="form-grid"><label>Template name<input name="name" required/></label><label>Category<select name="category"><option value="booking">Booking</option><option value="payment">Payment</option><option value="reminder">Reminder</option><option value="guide">Guide</option><option value="follow_up">Follow-up</option><option value="custom">Custom</option></select></label></div><input type="hidden" name="channel" value="messenger"/><label>Message<textarea name="body" rows={5} required placeholder="Use {{first_name}}, {{event_title}}, {{event_date}}, {{location}}, {{booking_reference}}..."/></label><button className="create-button">Save template</button></form>}
   <div className="communication-selectors">
    <label>Customer<select value={customerId} onChange={e=>{setCustomerId(e.target.value);setBookingId("")}}><option value="">Select customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.full_name} — {c.email||c.phone||"No contact"}</option>)}</select></label>
    <label>Booking<select value={bookingId} onChange={e=>setBookingId(e.target.value)} disabled={!customerId}><option value="">No specific booking</option>{customerBookings.map(b=><option key={b.id} value={b.id}>{b.reference||b.id.slice(0,8)} — {b.event_sessions.events.title}</option>)}</select></label>
    <label>Template<select value={templateId} onChange={e=>selectTemplate(e.target.value)}><option value="">Custom message</option>{templates.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
   </div>
   {customer&&<div className="messenger-contact-card"><div><span className="messenger-icon">💬</span><div><b>{customer.full_name}</b><small>{customer.messenger_psid?(customer.messenger_marketing_opt_in?"Messenger connected · updates + offers":"Messenger connected · service updates"):(customer.messenger_transactional_opt_in?"Messenger opted in · connection pending":customer.messenger_name?`Messenger: ${customer.messenger_name}`:"Messenger not connected")}</small></div></div><button className="mini-button" onClick={saveMessenger}>Edit Messenger details</button></div>}
   <label>Message<textarea className="communication-editor" rows={11} value={customBody} onChange={e=>{setCustomBody(e.target.value);setTemplateId("")}} placeholder="Write a message or choose a template..."/></label>
   <div className="merge-help"><b>Available fields:</b> {"{{first_name}} · {{full_name}} · {{event_title}} · {{booking_reference}} · {{quantity}} · {{location}} · {{event_date}} · {{event_time}} · {{my_guides_url}}"}</div>
  </section>

  <aside className="communication-preview-card">
   <span className="eyebrow">MESSENGER PREVIEW</span><div className="messenger-preview"><div className="messenger-bubble">{message||"Your personalized message will appear here."}</div></div>
   <div className="communication-actions"><button className="create-button wide" onClick={copyAndLog} disabled={busy||!message}>Copy message</button><a className={`secondary-button wide-link ${!customer?"disabled-link":""}`} href={customer?messengerTarget:"#"} target="_blank" onClick={e=>{if(!customer)e.preventDefault()}}>Open Messenger inbox ↗</a><button className="secondary-button" onClick={markSent} disabled={busy||!message}>✓ Mark as sent</button></div>
   <p className="communication-note">For now, Art Nation prepares and logs the message while staff sends it through Messenger. Direct automated Page messaging can be connected later after Meta app permissions are configured.</p>
  </aside>

  <section className="communications-history">
   <div className="dash-card-head"><div><h2>Communication history</h2><p>Recent prepared and manually sent messages</p></div></div>
   <div className="communication-log-list">{logs.length?logs.map(l=><article className="communication-log-row" key={l.id}><span className="comm-channel">{l.channel==="messenger"?"💬":l.channel==="email"?"✉":"☎"}</span><div><b>{l.customers?.full_name||"Unknown customer"}</b><span>{l.message_body}</span></div><div className="comm-log-meta"><b>{l.status==="sent_manual"?"Sent manually":"Prepared"}</b><span>{new Date(l.sent_at||l.created_at).toLocaleString()}</span></div></article>):<div className="empty-state">No communication history yet.</div>}</div>
  </section>
 </div>
}