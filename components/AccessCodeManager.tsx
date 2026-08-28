"use client";
import {useState} from "react";import QRCode from "qrcode";import {useRouter} from "next/navigation";import QrActions from "@/components/QrActions";
export default function AccessCodeManager({guides,codes}:{guides:any[];codes:any[]}){
 const [generated,setGenerated]=useState<any[]>([]),[busy,setBusy]=useState(false);const router=useRouter();
 async function create(e:any){e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const r=await fetch("/api/admin/access-codes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){alert(d.error||"Could not create codes.");return}const withQr=[];for(const c of d.codes){const url=`${window.location.origin}/activate/${c.code}`;withQr.push({...c,url,qr:await QRCode.toDataURL(url,{width:260,margin:1})})}setGenerated(withQr);router.refresh()}
 return <div className="access-layout">
  <form className="library-editor-card access-create" onSubmit={create}><div className="library-form-head"><span className="eyebrow">KIT / GUIDE ACCESS</span><h2>Generate activation codes</h2><p>Create QR-ready codes for Paint & Sip kits, gifts or manual guide access.</p></div>
   <label>Painting guide<select name="guide_id" required defaultValue=""><option value="" disabled>Select guide...</option>{guides.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
   <label>Label<input name="label" placeholder="e.g. Umbrella Lady Kit Batch Aug 2026"/></label>
   <div className="form-grid"><label>Number of codes<input name="count" type="number" min="1" max="100" defaultValue="1"/></label><label>Uses per code<input name="max_uses" type="number" min="1" defaultValue="1"/></label></div>
   <label>Expiry date (optional)<input name="expires_at" type="datetime-local"/></label>
   <button className="create-button" disabled={busy}>{busy?"Generating…":"Generate codes & QR links"}</button>
  </form>
  {generated.length>0&&<section className="generated-codes"><h2>New activation codes</h2><div className="activation-card-grid">{generated.map(c=><article className="activation-card" key={c.id}><img src={c.qr} alt={`QR ${c.code}`}/><b>{c.code}</b><small>{c.url}</small><button className="secondary-button" onClick={()=>navigator.clipboard.writeText(c.url)}>Copy activation link</button></article>)}</div></section>}
  <section className="modern-table-card"><table className="modern-table"><thead><tr><th>Code</th><th>Guide</th><th>Label</th><th>Usage</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead><tbody>{codes.map(c=><tr key={c.id}><td><b>{c.code}</b></td><td>{c.guides?.title}</td><td>{c.label||"—"}</td><td>{c.uses}/{c.max_uses}</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString():"Never"}</td><td><span className={`event-status ${c.active?"published":"draft"}`}>{c.active?"Active":"Inactive"}</span></td><td><QrActions id={c.id} code={c.code} title={c.guides?.title||"Painting guide"} label={c.label} type="kit" active={c.active}/></td></tr>)}</tbody></table></section>
 </div>
}