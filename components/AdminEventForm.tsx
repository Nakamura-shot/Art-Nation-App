"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";

type Meta={locations:any[];eventTypes:any[];guides?:any[];services?:any[];artworks?:any[];teachers?:any[]};
type Field={label:string;field_key:string;field_type:string;required:boolean;options:string};
type Template={id:string;name:string;is_default:boolean;form_template_fields:any[]};
export type EventFormInitial={
 sessionId:string;eventId:string;title:string;description:string;eventTypeId:string;locationId:string;serviceId?:string|null;artworkId?:string|null;
 date:string;startTime:string;endTime:string;capacity:number;regularPrice:number;earlyBirdPrice?:number|null;
 earlyBirdUntil?:string;coverUrl?:string;guideId?:string|null;fields:Field[]
};

function todayManila(){
 const now=new Date();
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const get=(t:string)=>parts.find(p=>p.type===t)?.value||"";
 return `${get("year")}-${get("month")}-${get("day")}`;
}

export default function AdminEventForm({meta,initial}:{meta:Meta;initial?:EventFormInitial}){
 const editing=!!initial;
 const router=useRouter();
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [title,setTitle]=useState(initial?.title||""),[description,setDescription]=useState(initial?.description||"");
 const [date,setDate]=useState(initial?.date||todayManila());
 const [startTime,setStartTime]=useState(initial?.startTime||"14:00"),[endTime,setEndTime]=useState(initial?.endTime||"18:00");
 const [capacity,setCapacity]=useState(initial?.capacity??30),[regularPrice,setRegularPrice]=useState(initial?.regularPrice??1200);
 const [templates,setTemplates]=useState<Template[]>([]),[selectedTemplate,setSelectedTemplate]=useState("");
 const [selectedLocation,setSelectedLocation]=useState(initial?.locationId||meta.locations?.[0]?.id||"");
 const [selectedService,setSelectedService]=useState(initial?.serviceId||"");
 const [selectedArtwork,setSelectedArtwork]=useState(initial?.artworkId||"");
 const [fields,setFields]=useState<Field[]>(initial?.fields?.length?initial.fields:[
  {label:"Age",field_key:"age",field_type:"number",required:true,options:""},
  {label:"Choice of drink",field_key:"drink",field_type:"select",required:true,options:"Hot Chocolate, Iced Coffee"}
 ]);

 useEffect(()=>{
  fetch("/api/admin/form-templates").then(async r=>{
   if(!r.ok)return;const rows=await r.json();setTemplates(rows);
   if(!editing){const d=rows.find((x:Template)=>x.is_default);if(d){setSelectedTemplate(d.id);applyTemplate(d)}}
  }).catch(()=>{})
 },[editing]);

 function addField(){setFields([...fields,{label:"",field_key:"",field_type:"text",required:false,options:""}])}
 function update(i:number,k:keyof Field,v:any){setFields(fields.map((f,j)=>j===i?{...f,[k]:v}:f))}
 function normalizedFields(){return fields.filter(f=>f.label&&f.field_key).map((f,i)=>({...f,sort_order:i,options:f.field_type==="select"?f.options.split(",").map(x=>x.trim()).filter(Boolean):null}))}
 function applyTemplate(t:Template){setFields([...(t.form_template_fields||[])].sort((a,b)=>a.sort_order-b.sort_order).map(f=>({label:f.label,field_key:f.field_key,field_type:f.field_type,required:f.required,options:Array.isArray(f.options)?f.options.join(", "):""})))}
 function chooseTemplate(id:string){setSelectedTemplate(id);const t=templates.find(x=>x.id===id);if(t)applyTemplate(t)}
 function chooseLocation(id:string){
  setSelectedLocation(id);
  if(editing)return;
  const loc=meta.locations.find((x:any)=>x.id===id);
  if(loc?.default_form_template_id){
   const t=templates.find(x=>x.id===loc.default_form_template_id);
   if(t){setSelectedTemplate(t.id);applyTemplate(t)}
  }
 }
 function chooseService(id:string){setSelectedService(id);if(editing)return;const s=meta.services?.find((x:any)=>x.id===id);if(!s)return;if(s.default_capacity)setCapacity(Number(s.default_capacity));if(s.default_price!=null)setRegularPrice(Number(s.default_price));if(s.default_duration_minutes){const [h,m]=startTime.split(":").map(Number);const end=h*60+m+Number(s.default_duration_minutes);setEndTime(`${String(Math.floor(end/60)%24).padStart(2,"0")}:${String(end%60).padStart(2,"0")}`);}}
 async function saveTemplate(){
  const name=prompt("Name this participant form template:","Default Paint & Sip Form");if(!name)return;
  const makeDefault=confirm("Use this as the default form for new events?");
  const r=await fetch("/api/admin/form-templates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,is_default:makeDefault,fields:normalizedFields()})});
  const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||"Could not save template.");return}
  const refreshed=await fetch("/api/admin/form-templates").then(r=>r.json());setTemplates(refreshed);setSelectedTemplate(d.id);
 }
 async function submit(e:any){
  e.preventDefault();setBusy(true);setMsg("");
  const fd=new FormData(e.currentTarget);const body:any=Object.fromEntries(fd.entries());
  body.description=description;body.date=date;body.capacity=Number(body.capacity);
  body.regular_price=Number(body.regular_price);body.early_bird_price=body.early_bird_price?Number(body.early_bird_price):null;
  body.fields=normalizedFields();

  const endpoint=editing?`/api/admin/events/${initial!.sessionId}`:"/api/admin/events";
  const r=await fetch(endpoint,{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){setBusy(false);setMsg(d.error||(editing?"Could not update event.":"Could not create event."));return}

  router.push("/admin/events");router.refresh();
 }

 return <form className="event-editor" onSubmit={submit}>
  <div className="editor-main">
   <section className="editor-card">
    <div className="editor-card-head"><span>1</span><div><h2>Event details</h2><p>Tell people what this event is all about.</p></div></div>
    <div className="event-details-grid">
     <div className="event-copy-fields">
      <label>Event title<input name="title" required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Tropical Pop Paint & Sip"/></label>
      <label>Description</label><RichTextEditor value={description} onChange={setDescription}/>
     </div>
    </div>
     <div className="form-grid">
      <label>Service<select name="service_id" value={selectedService} onChange={e=>chooseService(e.target.value)}><option value="">Choose service</option>{(meta.services||[]).filter((x:any)=>x.active).map((x:any)=><option value={x.id} key={x.id}>{x.name}</option>)}</select><a className="inline-admin-link" href="/admin/services">Manage services</a></label>
      <label>Artwork<select name="artwork_id" value={selectedArtwork} onChange={e=>setSelectedArtwork(e.target.value)}><option value="">No artwork selected</option>{(meta.artworks||[]).filter((x:any)=>x.active).map((x:any)=><option value={x.id} key={x.id}>{x.title}</option>)}</select><a className="inline-admin-link" href="/admin/artworks">Manage artwork</a></label>
      <label>Event type<select name="event_type_id" required defaultValue={initial?.eventTypeId}>{meta.eventTypes.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <label>Lead teacher<select name="teacher_id" defaultValue=""><option value="">Not assigned</option>{(meta.teachers||[]).filter((x:any)=>x.active&&x.can_lead).map((x:any)=><option value={x.id} key={x.id}>{x.full_name} · {x.engagement_type} · {(x.teacher_capability_links||[]).map((c:any)=>c.teacher_capabilities?.name).filter(Boolean).join(", ")||"No capabilities"}</option>)}</select><a className="inline-admin-link" href="/admin/teachers">Manage teachers</a></label>
     <label>Location<select name="location_id" required value={selectedLocation} onChange={e=>chooseLocation(e.target.value)}>{meta.locations.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select><a className="inline-admin-link" href="/admin/locations">Manage locations</a></label><label>Painting / digital guide<select name="guide_id" defaultValue={initial?.guideId||""}><option value="">No guide attached</option>{(meta.guides||[]).map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select><a className="inline-admin-link" href="/admin/paintings">Manage painting library</a></label>
    </div>
   </section>

   <div className="editor-two-col">
    <section className="editor-card"><div className="editor-card-head"><span>2</span><div><h2>Schedule & capacity</h2><p>When it is happening and how many can join.</p></div></div>
     <div className="form-grid three">
      <label>Date<input type="date" name="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Start time<input type="time" name="start_time" value={startTime} onChange={e=>setStartTime(e.target.value)} required/></label>
      <label>End time<input type="time" name="end_time" value={endTime} onChange={e=>setEndTime(e.target.value)} required/></label>
     </div>
      <label>Maximum participants<input type="number" name="capacity" min="1" value={capacity} onChange={e=>setCapacity(Number(e.target.value))} required/></label>
    </section>
    <section className="editor-card"><div className="editor-card-head"><span>3</span><div><h2>Pricing</h2><p>Set your pricing options.</p></div></div>
     <div className="form-grid">
      <label>Regular price (₱)<input type="number" name="regular_price" min="0" value={regularPrice} onChange={e=>setRegularPrice(Number(e.target.value))} required/></label>
      <label>Early Bird price (₱)<input type="number" name="early_bird_price" min="0" defaultValue={initial?.earlyBirdPrice??1000}/></label>
     </div>
     <label>Early Bird deadline<input type="datetime-local" name="early_bird_until" defaultValue={initial?.earlyBirdUntil||""}/></label>
    </section>
   </div>

   <section className="editor-card">
    <div className="editor-card-head split">
     <div className="number-title"><span>4</span><div><h2>Participant form</h2><p>Questions repeated for every participant.</p></div></div>
     <div className="template-actions"><button type="button" className="secondary-button" onClick={addField}>＋ Add question</button><button type="button" className="secondary-button" onClick={saveTemplate}>♡ Save form</button></div>
    </div>
    <div className="template-picker"><div><label>Saved form template<select value={selectedTemplate} onChange={e=>chooseTemplate(e.target.value)}><option value="">Current custom form</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}{t.is_default?" — Default":""}</option>)}</select></label></div><p>Save a drink/menu form once, then reuse it for future events.</p></div>
    <div className="field-builder">{fields.map((f,i)=><div className="field-row" key={i}><div className="drag">⋮⋮</div><input aria-label="Question" placeholder="Question label" value={f.label} onChange={e=>update(i,"label",e.target.value)}/><select value={f.field_type} onChange={e=>update(i,"field_type",e.target.value)}><option value="text">Text</option><option value="number">Number</option><option value="select">Dropdown</option><option value="textarea">Long text</option></select>{f.field_type==="select"&&<input className="options-input" placeholder="Options separated by commas" value={f.options} onChange={e=>update(i,"options",e.target.value)}/>}<label className="inline-check"><input type="checkbox" checked={f.required} onChange={e=>update(i,"required",e.target.checked)}/> Required</label><button type="button" className="icon-delete" onClick={()=>setFields(fields.filter((_,j)=>j!==i))}>×</button></div>)}</div>
   </section>
  </div>

  <aside className="editor-side">
   <section className="preview-card"><div className="preview-art">{(()=>{const a=meta.artworks?.find((x:any)=>x.id===selectedArtwork);return a?.cover_image_path?<img src={a.cover_image_path} alt="Preview"/>:"🎨"})()}</div><span className="preview-pill">Event preview</span><h3>{title||"Your event title"}</h3>{description?<div className="preview-rich" dangerouslySetInnerHTML={{__html:description}}/>:<p>Your event description will appear here.</p>}<div className="preview-meta"><span>📅 {date||"Date & time"}</span><span>📍 Venue</span><span>👥 Capacity</span></div></section>
   <section className="publish-card"><h3>{editing?"Save your changes":"Ready to publish?"}</h3><p>{editing?"Updates will appear on the public booking page.":"The event will appear on the public booking page immediately."}</p>{msg&&<div className="error-box">{msg}</div>}<button className="create-button wide" disabled={busy}>{busy?(editing?"Saving…":"Creating event…"):(editing?"Save changes":"Create & publish event")}</button><small>{editing?"Existing bookings are kept intact.":"You can unpublish it later from Events."}</small></section>
  </aside>
 </form>
}
