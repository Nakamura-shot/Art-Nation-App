"use client";
import {useState} from "react";import QRCode from "qrcode";import {useRouter} from "next/navigation";import QrActions from "@/components/QrActions";

export default function EventAccessManager({sessions,codes}:{sessions:any[];codes:any[]}){
 const [generated,setGenerated]=useState<any|null>(null),[busy,setBusy]=useState(false);const router=useRouter();
 async function create(e:any){
  e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());
  const r=await fetch("/api/admin/event-access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){alert(d.error||"Could not create event QR.");return}
  const url=`${window.location.origin}/event-access/${d.access.code}`;
  const qr=await QRCode.toDataURL(url,{width:420,margin:2});
  setGenerated({...d.access,url,qr});router.refresh();
 }
 return <div className="event-access-layout">
  <form className="library-editor-card event-access-create" onSubmit={create}>
   <div className="library-form-head"><span className="eyebrow">EVENT GUIDE QR</span><h2>Create temporary workshop QR</h2><p>Guests scan once and the painting guide opens immediately. No booking reference, email or login required.</p></div>
   <label>Event<select name="event_session_id" required defaultValue=""><option value="" disabled>Select an upcoming event...</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.events.title} — {new Date(s.starts_at).toLocaleString()}</option>)}</select></label>
   <label>Label<input name="label" placeholder="e.g. Tropical Pop — projector QR"/></label>
   <div className="form-grid"><label>Access opens<input name="starts_at" type="datetime-local"/></label><label>Expires<input name="expires_at" type="datetime-local"/></label></div>
   <button className="create-button" disabled={busy}>{busy?"Creating…":"Create expiring event QR"}</button>
  </form>

  {generated&&<section className="event-qr-display-card">
   <span className="eyebrow">READY FOR THE EVENT</span><h2>{generated.label||"Event Guide Access"}</h2>
   <img src={generated.qr} alt="Event guide QR"/>
   <b>{generated.code}</b><small>{generated.url}</small>
   <div className="qr-display-actions"><button className="secondary-button" onClick={()=>navigator.clipboard.writeText(generated.url)}>Copy link</button><a className="secondary-button" href={generated.qr} download={`art-nation-${generated.code}.png`}>Save QR image</a></div>
   <p>Display this QR on the studio TV, projector, easel or table sign. Guests scan it and the guide opens immediately. It expires automatically.</p>
  </section>}

  <section className="modern-table-card"><table className="modern-table"><thead><tr><th>Event</th><th>Code</th><th>Window</th><th>Status</th><th>Actions</th></tr></thead><tbody>{codes.map(c=>{const expired=new Date(c.expires_at)<new Date();return <tr key={c.id}><td><b>{c.event_sessions?.events?.title}</b><small>{c.label}</small></td><td><b>{c.code}</b></td><td>{c.starts_at?new Date(c.starts_at).toLocaleString():"Immediately"}<small>to {new Date(c.expires_at).toLocaleString()}</small></td><td><span className={`event-status ${c.active&&!expired?"published":"draft"}`}>{expired?"Expired":c.active?"Active":"Inactive"}</span></td><td><QrActions id={c.id} code={c.code} title={c.event_sessions?.events?.title||"Workshop guide"} label={c.label} type="event" active={c.active&&!expired}/></td></tr>})}</tbody></table></section>
 </div>
}