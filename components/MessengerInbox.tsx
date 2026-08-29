"use client";
import {useEffect,useMemo,useState} from "react";

type Customer={id:string;full_name:string;email?:string;phone?:string;messenger_psid:string;messenger_connected_at?:string;messenger_transactional_opt_in?:boolean;messenger_marketing_opt_in?:boolean};
type Msg={id:string;customer_id?:string|null;psid:string;direction:"inbound"|"outbound";message_type:string;body?:string|null;status:string;read_at?:string|null;created_at:string};
function initials(n:string){return n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"?"}
function time(v:string){return new Date(v).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function firstName(n:string){return n.trim().split(/\s+/)[0]||"there"}

export default function MessengerInbox({customers,initialMessages,templates}:{customers:Customer[];initialMessages:Msg[];templates:any[]}){
 const [messages,setMessages]=useState<Msg[]>([...initialMessages].reverse());
 const [selected,setSelected]=useState<string>(customers[0]?.id||(initialMessages.find(m=>!m.customer_id)?.psid?`psid:${initialMessages.find(m=>!m.customer_id)!.psid}`:""));
 const [draft,setDraft]=useState(""); const [busy,setBusy]=useState(false); const [search,setSearch]=useState("");
 const customerById=useMemo(()=>Object.fromEntries(customers.map(c=>[c.id,c])),[customers]);
 const threadInfo=useMemo(()=>{
  const known=customers.map(c=>{
   const ms=messages.filter(m=>m.customer_id===c.id||(!m.customer_id&&m.psid===c.messenger_psid)); const last=ms[ms.length-1];
   const unread=ms.filter(m=>m.direction==="inbound"&&!m.read_at).length; return {key:c.id,c,last,unread,unknown:false};
  });
  const knownPsids=new Set(customers.map(c=>c.messenger_psid));
  const unknown=Array.from(new Set(messages.filter(m=>!m.customer_id&&!knownPsids.has(m.psid)).map(m=>m.psid))).map(psid=>{
   const ms=messages.filter(m=>!m.customer_id&&m.psid===psid);const last=ms[ms.length-1];const unread=ms.filter(m=>m.direction==="inbound"&&!m.read_at).length;
   const c:any={id:`psid:${psid}`,full_name:"New Messenger contact",messenger_psid:psid}; return {key:c.id,c,last,unread,unknown:true};
  });
  return [...known,...unknown].sort((a,b)=>new Date(b.last?.created_at||b.c.messenger_connected_at||0).getTime()-new Date(a.last?.created_at||a.c.messenger_connected_at||0).getTime());
 },[customers,messages]);
 const visible=threadInfo.filter(t=>`${t.c.full_name} ${t.c.email||""} ${t.c.phone||""}`.toLowerCase().includes(search.toLowerCase()));
 const unknownSelected=selected.startsWith("psid:")?selected.slice(5):"";
 const c:any=unknownSelected?{id:selected,full_name:"New Messenger contact",messenger_psid:unknownSelected}:customerById[selected]; const conversation=messages.filter(m=>unknownSelected?(!m.customer_id&&m.psid===unknownSelected):(m.customer_id===selected||(!m.customer_id&&c&&m.psid===c.messenger_psid)));

 async function refresh(){
  if(!selected)return; const isUnknown=selected.startsWith("psid:"); const value=isUnknown?selected.slice(5):selected; const r=await fetch(`/api/admin/messenger/messages?${isUnknown?"psid":"customer"}=${encodeURIComponent(value)}`,{cache:"no-store"}); if(!r.ok)return;
  const d=await r.json(); setMessages(prev=>{
   const others=prev.filter(m=>isUnknown?m.psid!==value:m.customer_id!==selected); return [...others,...(d.messages||[])].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
  });
 }
 useEffect(()=>{const id=setInterval(refresh,8000);return()=>clearInterval(id)},[selected]);
 useEffect(()=>{if(!selected)return;const isUnknown=selected.startsWith("psid:");const value=isUnknown?selected.slice(5):selected;fetch("/api/admin/messenger/messages",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(isUnknown?{psid:value}:{customer_id:value})}).then(()=>setMessages(ms=>ms.map(m=>((isUnknown?(!m.customer_id&&m.psid===value):m.customer_id===selected)&&m.direction==="inbound")?{...m,read_at:m.read_at||new Date().toISOString()}:m))).catch(()=>{})},[selected]);

 function applyTemplate(id:string){const t=templates.find(x=>x.id===id);if(t&&c)setDraft(String(t.body||"").replace(/\{\{first_name\}\}/g,firstName(c.full_name)).replace(/\{\{full_name\}\}/g,c.full_name))}
 async function send(){
  if(!selected||!draft.trim()||busy)return; setBusy(true);
  const text=draft.trim(); const isUnknown=selected.startsWith("psid:"); const r=await fetch("/api/admin/messenger/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(isUnknown?{psid:selected.slice(5),message:text}:{customer_id:selected,message:text})}); const d=await r.json().catch(()=>({})); setBusy(false);
  if(!r.ok)return alert(d.error||"Could not send message."); setDraft(""); await refresh();
 }
 return <div className="messenger-admin-layout">
  <aside className="messenger-thread-panel">
   <div className="messenger-panel-title"><div><b>Inbox</b><span>{threadInfo.reduce((n,t)=>n+t.unread,0)} unread</span></div><button className="mini-button" onClick={refresh}>Refresh</button></div>
   <input className="messenger-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers..."/>
   <div className="messenger-thread-list">{visible.map(({key,c,last,unread,unknown})=><button key={key} className={`messenger-thread ${selected===key?"active":""}`} onClick={()=>setSelected(key)}><span className="messenger-avatar">{initials(c.full_name)}</span><span className="messenger-thread-copy"><b>{c.full_name}</b><small>{last?.body||"Messenger connected"}</small></span><span className="messenger-thread-meta"><small>{last?time(last.created_at):""}</small>{unread>0&&<em>{unread}</em>}</span></button>)}</div>
  </aside>
  <section className="messenger-chat-panel">{c?<>
   <header className="messenger-chat-head"><span className="messenger-avatar large">{initials(c.full_name)}</span><div><h2>{c.full_name}</h2><p>{c.email||c.phone||(unknownSelected?`Unmatched Messenger ID ${unknownSelected}`:"Messenger customer")} {!unknownSelected&&<>· {c.messenger_marketing_opt_in?"Deals + updates":"Service updates"}</>}</p></div></header>
   <div className="messenger-chat-scroll">{conversation.length?conversation.map(m=><div key={m.id} className={`messenger-line ${m.direction}`}><div className="messenger-message-bubble"><span>{m.body||`[${m.message_type}]`}</span><small>{time(m.created_at)}{m.direction==="outbound"&&m.status==="failed"?" · Failed":""}</small></div></div>):<div className="empty-state">No messages in this conversation yet.</div>}</div>
   <div className="messenger-compose-box"><div className="messenger-compose-tools"><select defaultValue="" onChange={e=>{applyTemplate(e.target.value);e.currentTarget.value=""}}><option value="">Insert template…</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><span>Replies are sent as the Art Nation Cebu Page.</span></div><textarea rows={3} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Message ${firstName(c.full_name)}...`} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}/><div className="messenger-send-row"><small>Enter to send · Shift+Enter for a new line</small><button className="create-button" onClick={send} disabled={busy||!draft.trim()}>{busy?"Sending…":"Send in Messenger"}</button></div></div>
  </>:<div className="empty-state">Choose a Messenger customer.</div>}</section>
 </div>
}
