"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";

function senderName(v:string){return v?.replace(/<[^>]+>/,"").replace(/"/g,"").trim()||v}
function senderEmail(v:string){return v?.match(/<([^>]+)>/)?.[1]||v||""}
function shortDate(v:any){const d=new Date(v);return isNaN(d.getTime())?"":d.toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function fmtDate(v?:string){if(!v)return"";return new Date(v).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
function fmtTime(v?:string){if(!v)return"";return new Date(v).toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit"})}
function firstName(v?:string){return String(v||"").trim().split(/\s+/)[0]||"there"}
function merge(text:string,c:any,b:any){
 const vals:any={
  first_name:firstName(c?.full_name),full_name:c?.full_name||"",email:c?.email||"",phone:c?.phone||"",
  event_title:b?.event_sessions?.events?.title||"",booking_reference:b?.reference||"",quantity:b?.quantity||"",
  location:b?.event_sessions?.locations?.name||"",event_date:fmtDate(b?.event_sessions?.starts_at),
  event_time:fmtTime(b?.event_sessions?.starts_at),
  my_guides_url:typeof window!=="undefined"&&c?.portal_token?`${window.location.origin}/my-guides/${c.portal_token}`:"",
  custom_content:""
 };
 return String(text||"").replace(/\{\{(\w+)\}\}/g,(_,k)=>String(vals[k]??`{{${k}}}`));
}

export default function AdminEmailClient({account,customers,bookings,templates,initialCustomer,initialBooking}:{account:any;customers:any[];bookings:any[];templates:any[];initialCustomer?:string;initialBooking?:string}){
 const router=useRouter();
 const initialBookingObj=bookings.find(b=>b.id===initialBooking);
 const derivedCustomer=initialCustomer||initialBookingObj?.orders?.customer_id||"";
 const [view,setView]=useState<"mail"|"templates">("mail");
 const [folder,setFolder]=useState<"inbox"|"sent">("inbox"),[unread,setUnread]=useState(false);
 const [messages,setMessages]=useState<any[]>([]),[selected,setSelected]=useState<any|null>(null),[loading,setLoading]=useState(false),[query,setQuery]=useState(""),[error,setError]=useState(""),[lastRefresh,setLastRefresh]=useState<Date|null>(null);
 const [compose,setCompose]=useState(!!derivedCustomer),[customerId,setCustomerId]=useState(derivedCustomer),[bookingId,setBookingId]=useState(initialBooking||"");
 const [to,setTo]=useState(""),[subject,setSubject]=useState(""),[body,setBody]=useState(""),[sending,setSending]=useState(false),[templateId,setTemplateId]=useState("");
 const [editing,setEditing]=useState<any|null>(null),[showNew,setShowNew]=useState(false);

 const customer=customers.find(c=>c.id===customerId);
 const customerBookings=useMemo(()=>bookings.filter(b=>!customerId||b.orders?.customer_id===customerId),[bookings,customerId]);
 const booking=bookings.find(b=>b.id===bookingId);

 useEffect(()=>{if(customer?.email)setTo(customer.email)},[customer?.email]);
 useEffect(()=>{if(account)load("inbox",false,"")},[!!account]);
 useEffect(()=>{
  if(!account||view!=="mail"||compose||selected)return;
  const timer=setInterval(()=>load(folder,unread,query,true),60000);
  return ()=>clearInterval(timer);
 },[!!account,view,folder,unread,query,compose,selected]);

 async function load(nextFolder=folder,nextUnread=unread,q=query,quiet=false){
  if(!quiet)setLoading(true);setError("");if(!quiet)setSelected(null);
  const r=await fetch(`/api/admin/email/messages?folder=${nextFolder}&unread=${nextUnread?"1":"0"}&q=${encodeURIComponent(q)}`);
  const d=await r.json().catch(()=>({}));if(!quiet)setLoading(false);
  if(!r.ok){setError(d.error||"Could not load email.");return}setMessages(d.messages||[]);setLastRefresh(new Date());
 }
 async function chooseFolder(f:"inbox"|"sent",u=false){setFolder(f);setUnread(u);await load(f,u,query)}
 async function openMessage(m:any){
  setLoading(true);const r=await fetch(`/api/admin/email/threads/${m.uid}?mailbox=${encodeURIComponent(m.mailbox)}`);const d=await r.json().catch(()=>({}));setLoading(false);
  if(!r.ok)return alert(d.error||"Could not open message.");setSelected(d.message);
 }
 function search(e:any){e.preventDefault();load(folder,unread,query)}
 function startCompose(){
  setSelected(null);setCompose(true);setTemplateId("");
  if(!customerId){setTo("");setBookingId("")}setSubject("");setBody("");
 }
 function reply(m:any){
  const email=senderEmail(m.from);const matched=customers.find(c=>String(c.email||"").toLowerCase()===email.toLowerCase());
  if(matched)setCustomerId(matched.id);setTo(email);setSubject(/^re:/i.test(m.subject||"")?m.subject:`Re: ${m.subject||""}`);setBody("");setCompose(true);setTemplateId("");
 }
 function applyTemplate(id:string){
  setTemplateId(id);const t=templates.find(x=>x.id===id);if(!t)return;
  setSubject(merge(t.subject||"",customer,booking));setBody(merge(t.body||"",customer,booking));
 }
 async function send(){
  if(!to||!subject||!body)return alert("Recipient, subject and message are required.");
  setSending(true);const matched=customers.find(c=>String(c.email||"").toLowerCase()===String(to).toLowerCase());
  const r=await fetch("/api/admin/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
   to,subject,body,customer_id:matched?.id||customer?.id||null,booking_id:bookingId||null,
   inReplyTo:selected?.messageId||undefined,references:selected?.references||selected?.messageId||undefined
  })});
  const d=await r.json().catch(()=>({}));setSending(false);if(!r.ok)return alert(d.error||"Could not send email.");
  setCompose(false);setSelected(null);setBody("");alert("Email sent from hello@artnation.ph.");await chooseFolder("sent");
 }
 async function testConnection(){
  const r=await fetch("/api/admin/email/test");const d=await r.json().catch(()=>({}));
  alert(r.ok?`Email connected.\nIMAP: ${d.imap}\nSMTP: ${d.smtp}\nFrom: ${d.email}`:`Connection failed: ${d.error||"Unknown error"}`);
 }
 async function saveTemplate(e:any,id?:string){
  e.preventDefault();const f=new FormData(e.currentTarget);const payload=Object.fromEntries(f.entries());
  const url=id?`/api/admin/communication-templates/${id}`:"/api/admin/communication-templates";
  const method=id?"PATCH":"POST";const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,channel:"email"})});
  const d=await r.json().catch(()=>({}));if(!r.ok)return alert(d.error||"Could not save template.");
  setEditing(null);setShowNew(false);router.refresh();
 }
 async function archiveTemplate(id:string){
  if(!confirm("Archive this email template?"))return;
  const r=await fetch(`/api/admin/communication-templates/${id}`,{method:"DELETE"});if(!r.ok)return alert("Could not archive template.");router.refresh();
 }

 if(!account)return <section className="email-connect-card"><div className="email-mail-mark">＠</div><span className="eyebrow">ART NATION EMAIL</span><h2>Configure hello@artnation.ph</h2><p>V25 connects directly to your cPanel mailbox using secure IMAP for incoming mail and SMTP for outgoing mail.</p><div className="email-config-example"><code>EMAIL_IMAP_HOST=artnation.ph</code><code>EMAIL_IMAP_PORT=993</code><code>EMAIL_SMTP_HOST=artnation.ph</code><code>EMAIL_SMTP_PORT=465</code><code>EMAIL_USERNAME=hello@artnation.ph</code><code>EMAIL_PASSWORD=••••••••</code></div><p className="email-config-note">Add these values to <b>.env.local</b>, restart the development server, then return here.</p></section>;

 return <div className="email-v25">
  <div className="email-module-tabs"><button className={view==="mail"?"active":""} onClick={()=>setView("mail")}>Inbox & Send</button><button className={view==="templates"?"active":""} onClick={()=>setView("templates")}>Email Templates</button><span className="email-account-pill">● {account.email}</span><button className="email-test-btn" onClick={testConnection}>Test connection</button></div>

  {view==="mail"&&<div className="email-app">
   <aside className="email-sidebar">
    <button className="create-button email-compose-btn" onClick={startCompose}>＋ Compose</button>
    <nav>
     <button className={folder==="inbox"&&!unread?"active":""} onClick={()=>chooseFolder("inbox",false)}>▣ Inbox</button>
     <button className={folder==="inbox"&&unread?"active":""} onClick={()=>chooseFolder("inbox",true)}>● Unread</button>
     <button className={folder==="sent"?"active":""} onClick={()=>chooseFolder("sent",false)}>↗ Sent</button>
    </nav>
    <div className="email-account"><b>{account.name}</b><span>{account.email}</span><span>IMAP: {account.imapHost}</span><span>SMTP: {account.smtpHost}</span></div>
   </aside>

   <section className="email-main">
    <form className="email-search" onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search recent mail by sender or subject..."/><button>Search</button><button type="button" className="email-refresh-btn" onClick={()=>load(folder,unread,query)} disabled={loading}>↻ Refresh</button></form>
    {error&&<div className="error-box">{error}</div>}
    {!selected&&!compose&&<div className="email-list">
     <div className="email-list-head"><b>{folder==="sent"?"Sent":unread?"Unread":"Inbox"}</b><span>{loading?"Loading…":`${messages.length} messages${lastRefresh?` · refreshed ${lastRefresh.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`:""}`}</span></div>
     {messages.map(m=><button className={`email-row ${m.flags?.includes("\\Seen")?"":"unread"}`} key={`${m.mailbox}-${m.uid}`} onClick={()=>openMessage(m)}>
      <div className="email-sender"><b>{senderName(folder==="sent"?m.to:m.from)}</b>{m.customer&&<span className="email-customer-badge">Customer</span>}</div>
      <div className="email-subject"><b>{m.subject||"(no subject)"}</b><span>{m.hasAttachments?" · attachment":""}</span></div><time>{shortDate(m.internalDate||m.date)}</time>
     </button>)}
     {!loading&&!messages.length&&<div className="table-empty">No emails found.</div>}
    </div>}

    {selected&&!compose&&<div className="email-thread">
     <button className="email-back" onClick={()=>setSelected(null)}>← Back to mailbox</button>
     <div className="email-thread-title"><div><h2>{selected.subject}</h2><small>{selected.from}</small></div><button className="secondary-button" onClick={()=>reply(selected)}>Reply</button></div>
     <article className="email-message"><header><div className="email-avatar">{senderName(selected.from).charAt(0).toUpperCase()}</div><div><b>{senderName(selected.from)}</b><span>To: {selected.to}</span></div><time>{shortDate(selected.internalDate||selected.date)}</time></header>
      {selected.html?<iframe className="email-html-frame" sandbox="" srcDoc={selected.html} title={selected.subject}/>:<div className="email-text">{selected.text}</div>}
      {!!selected.attachments?.length&&<div className="email-attachments"><b>Attachments</b>{selected.attachments.map((a:any,i:number)=><span key={i}>{a.filename} · {Math.ceil(a.size/1024)} KB</span>)}</div>}
     </article>
    </div>}

    {compose&&<div className="email-compose">
     <div className="email-compose-head"><h2>{selected?"Reply":"New email"}</h2><button onClick={()=>setCompose(false)}>×</button></div>
     <div className="email-compose-context">
      <label>Customer<select value={customerId} onChange={e=>{const id=e.target.value;setCustomerId(id);setBookingId("");const c=customers.find(x=>x.id===id);setTo(c?.email||"")}}><option value="">No customer selected</option>{customers.filter(c=>c.email).map(c=><option value={c.id} key={c.id}>{c.full_name} — {c.email}</option>)}</select></label>
      <label>Booking<select value={bookingId} onChange={e=>setBookingId(e.target.value)} disabled={!customerId}><option value="">No specific booking</option>{customerBookings.map(b=><option key={b.id} value={b.id}>{b.reference||b.id.slice(0,8)} — {b.event_sessions.events.title}</option>)}</select></label>
      <label>Template<select value={templateId} onChange={e=>applyTemplate(e.target.value)}><option value="">No template</option>{templates.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
     </div>
     <label>To<input value={to} onChange={e=>setTo(e.target.value)} placeholder="customer@example.com"/></label>
     <label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)}/></label>
     <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your email..." rows={16}/>
     <div className="email-merge-help"><b>Template fields:</b> {"{{first_name}} · {{full_name}} · {{event_title}} · {{booking_reference}} · {{quantity}} · {{location}} · {{event_date}} · {{event_time}} · {{my_guides_url}}"}</div>
     <div className="email-compose-actions"><button className="create-button" onClick={send} disabled={sending}>{sending?"Sending…":"Send email"}</button><button className="secondary-button" onClick={()=>setCompose(false)}>Cancel</button></div>
    </div>}
   </section>
  </div>}

  {view==="templates"&&<section className="email-template-manager">
   <div className="email-template-head"><div><span className="eyebrow">REUSABLE EMAILS</span><h2>Email templates</h2><p>Edit the messages staff can insert while composing customer email.</p></div><button className="create-button" onClick={()=>{setShowNew(true);setEditing(null)}}>＋ New template</button></div>
   {(showNew||editing)&&<TemplateForm template={editing} onSubmit={saveTemplate} onCancel={()=>{setShowNew(false);setEditing(null)}}/>}
   <div className="email-template-grid">{templates.filter(t=>t.active).map(t=><article className="email-template-card" key={t.id}><div className="email-template-card-top"><span>{t.category||"custom"}</span><div><button onClick={()=>{setEditing(t);setShowNew(false)}}>Edit</button><button onClick={()=>archiveTemplate(t.id)}>Archive</button></div></div><h3>{t.name}</h3><b>{t.subject||"(No subject)"}</b><p>{t.body}</p></article>)}</div>
  </section>}
 </div>
}

function TemplateForm({template,onSubmit,onCancel}:{template:any;onSubmit:(e:any,id?:string)=>void;onCancel:()=>void}){
 return <form className="email-template-editor" onSubmit={e=>onSubmit(e,template?.id)}>
  <div className="form-grid"><label>Template name<input name="name" required defaultValue={template?.name||""}/></label><label>Category<select name="category" defaultValue={template?.category||"custom"}><option value="booking">Booking</option><option value="payment">Payment</option><option value="reminder">Reminder</option><option value="guide">Guide</option><option value="follow_up">Follow-up</option><option value="promotion">Promotion</option><option value="custom">Custom</option></select></label></div>
  <label>Email subject<input name="subject" required defaultValue={template?.subject||""}/></label>
  <label>Message<textarea name="body" rows={12} required defaultValue={template?.body||""}/></label>
  <div className="email-merge-help"><b>Merge fields:</b> {"{{first_name}} · {{full_name}} · {{event_title}} · {{booking_reference}} · {{quantity}} · {{location}} · {{event_date}} · {{event_time}} · {{my_guides_url}}"}</div>
  <div className="email-compose-actions"><button className="create-button">{template?"Save changes":"Create template"}</button><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button></div>
 </form>
}