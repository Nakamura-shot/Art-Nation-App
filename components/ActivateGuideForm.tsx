"use client";
import {useState} from "react";
export default function ActivateGuideForm({code,guide}:{code:string;guide:any}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:any){
  e.preventDefault();setBusy(true);setError("");
  const f=new FormData(e.currentTarget);
  const r=await fetch(`/api/activate/${code}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.get("name"),email:f.get("email")})});
  const d=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok){setError(d.error||"Activation failed.");return}
  window.location.href=`/my-guides/${d.portalToken}`;
 }
 return <form className="activation-form panel" onSubmit={submit}>
  <span className="eyebrow">UNLOCK GUIDE</span><h2>{guide?.title||"Art Nation Painting Guide"}</h2>
  <p>Enter your details to add this painting guide to your Art Nation library.</p>
  <label>Full name<input name="name" placeholder="Your name"/></label>
  <label>Email<input type="email" name="email" required placeholder="you@example.com"/></label>
  {error&&<div className="error-box">{error}</div>}
  <button className="button primary-wide" disabled={busy}>{busy?"Activating…":"Activate guide"}</button>
 </form>
}