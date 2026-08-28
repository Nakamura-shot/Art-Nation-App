"use client";
import {useState} from "react";import {useRouter} from "next/navigation";

export default function GuideBuilder({painting,initialSteps,techniques,publicBase}:{painting:any;initialSteps:any[];techniques:any[];publicBase:string}){
 const router=useRouter();const [steps,setSteps]=useState(initialSteps);const [busy,setBusy]=useState(false);
 async function addStep(){setBusy(true);const r=await fetch(`/api/admin/paintings/${painting.id}/steps`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:`Step ${steps.length+1}`})});setBusy(false);if(!r.ok){alert("Could not add step.");return}router.refresh();location.reload()}
 async function saveStep(step:any,e:any){e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const r=await fetch(`/api/admin/guide-steps/${step.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok){alert("Could not save step.");return}for(const kind of ["image","video"]){const file=f.get(kind) as File;if(file&&file.size){const fd=new FormData();fd.append("kind",kind);fd.append("file",file);await fetch(`/api/admin/guide-steps/${step.id}/media`,{method:"POST",body:fd})}}router.refresh();alert("Step saved.")}
 async function remove(id:string){if(!confirm("Delete this guide step?"))return;await fetch(`/api/admin/guide-steps/${id}`,{method:"DELETE"});setSteps(steps.filter(s=>s.id!==id));router.refresh()}
 return <div className="guide-builder">
  <div className="guide-builder-head"><div><span className="eyebrow">GUIDE BUILDER</span><h2>{painting.title}</h2><p>Each step can include instructions, an image, a short video, and a reusable technique.</p></div><button className="create-button" onClick={addStep} disabled={busy}>＋ Add step</button></div>
  <div className="guide-step-list">{steps.map((s,i)=><form className="guide-step-card" key={s.id} onSubmit={e=>saveStep(s,e)}>
    <div className="guide-step-number">{i+1}</div>
    <div className="guide-step-content">
      <div className="form-grid"><label>Step title<input name="title" defaultValue={s.title}/></label><label>Referenced technique<select name="technique_id" defaultValue={s.technique_id||""}><option value="">No technique</option>{techniques.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label></div>
      <label>Instructions<textarea name="instructions" rows={6} defaultValue={s.instructions||""} placeholder="Keep this practical and beginner-friendly."/></label>
      <div className="form-grid"><label>Order<input name="sort_order" type="number" min="1" defaultValue={s.sort_order||i+1}/></label><label>External video URL<input name="video_url" defaultValue={s.video_url?.startsWith("http")?s.video_url:""} placeholder="YouTube/Vimeo optional"/></label></div>
      <div className="guide-media-row">
       {s.image_path&&<img src={`${publicBase}/storage/v1/object/public/guide-media/${s.image_path}`} alt={s.title}/>}
       <label>Step image<input name="image" type="file" accept="image/*"/></label>
       <label>Short video<input name="video" type="file" accept="video/*"/></label>
      </div>
      <div className="guide-step-actions"><button className="secondary-button">Save step</button><button type="button" className="text-button danger" onClick={()=>remove(s.id)}>Delete</button></div>
    </div>
  </form>)}</div>
  {!steps.length&&<div className="empty-public-state">No steps yet. Add the first step to begin building this painting guide.</div>}
 </div>
}