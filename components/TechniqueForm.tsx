"use client";
import {useState} from "react";import {useRouter} from "next/navigation";
export default function TechniqueForm({initial}:{initial?:any}){
 const router=useRouter(),editing=!!initial;const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:any){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());(body as any).active=f.get("active")==="on";const r=await fetch(editing?`/api/admin/techniques/${initial.id}`:"/api/admin/techniques",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok){setBusy(false);setError(d.error||"Save failed.");return}const id=editing?initial.id:d.id;for(const kind of ["image","video"]){const file=(f.get(kind) as File);if(file&&file.size){const fd=new FormData();fd.append("kind",kind);fd.append("file",file);await fetch(`/api/admin/techniques/${id}/media`,{method:"POST",body:fd})}}router.push("/admin/techniques");router.refresh()}
 return <form className="library-editor-card" onSubmit={submit}><div className="library-form-head"><div><span className="eyebrow">TECHNIQUE</span><h2>{editing?"Edit technique":"New technique"}</h2></div></div>
 <label>Title<input name="title" required defaultValue={initial?.title||""} placeholder="e.g. Blending"/></label>
 <div className="form-grid"><label>Category<input name="category" defaultValue={initial?.category||""} placeholder="Colour, Texture, Light & Form"/></label><label>Slug<input name="slug" defaultValue={initial?.slug||""} placeholder="auto-generated"/></label></div>
 <label>Short description<textarea name="short_description" rows={2} defaultValue={initial?.short_description||""}/></label>
 <label>Instructions<textarea name="instructions" rows={8} defaultValue={initial?.instructions||""} placeholder="Explain the technique in beginner-friendly steps..."/></label>
 <label>External video URL<input name="video_url" defaultValue={initial?.video_url?.startsWith("http")?initial.video_url:""} placeholder="YouTube, Vimeo, etc."/></label>
 <div className="form-grid"><label>Technique image<input name="image" type="file" accept="image/*"/></label><label>Short video upload<input name="video" type="file" accept="video/*"/></label></div>
 <label className="location-toggle"><input name="active" type="checkbox" defaultChecked={initial?.active??true}/><span><b>Active</b><small>Active techniques can be referenced by painting guides.</small></span></label>
 {error&&<div className="error-box">{error}</div>}<button className="create-button" disabled={busy}>{busy?"Saving…":"Save technique"}</button></form>
}