"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function AdminEventActions({id,active,slug}:{id:string;active:boolean;slug:string}){
 const [busy,setBusy]=useState(false); const router=useRouter();
 async function action(kind:"duplicate"|"toggle"){
  setBusy(true);
  const r=await fetch(`/api/admin/events/${id}/${kind}`,{method:"POST"});
  const d=await r.json().catch(()=>({}));
  setBusy(false);
  if(!r.ok){alert(d.error||"Action failed.");return;}
  router.refresh();
 }
 return <div className="event-action-row">
   <a className="mini-button" href={`/admin/events/${id}/edit`}>Edit</a>
   <a className="mini-button" href={`/events/${slug}`} target="_blank">View</a>
   <button className="mini-button" disabled={busy} onClick={()=>action("duplicate")}>Duplicate</button>
   <button className="mini-button" disabled={busy} onClick={()=>action("toggle")}>{active?"Unpublish":"Publish"}</button>
 </div>
}