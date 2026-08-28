"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Template={id:string;name:string;is_default:boolean};
type MenuItem={id:string;name:string;description?:string|null;price?:number|null;image_path?:string|null;category?:string|null;sort_order:number;active:boolean};
type LocationRow={
 id:string;name:string;slug?:string|null;address?:string|null;public_description?:string|null;image_path?:string|null;
 website_url?:string|null;opening_hours?:string|null;contact_name?:string|null;phone?:string|null;email?:string|null;
 notes?:string|null;capacity_notes?:string|null;maps_url?:string|null;active:boolean;default_form_template_id?:string|null;
 form_templates?:{name:string}|null;location_menu_items?:MenuItem[];
};

function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function emptyLocation(){return {name:"",slug:"",address:"",public_description:"",website_url:"",opening_hours:"",contact_name:"",phone:"",email:"",notes:"",capacity_notes:"",maps_url:"",active:true,default_form_template_id:""}}

export default function LocationsManager({initial,templates,publicBase}:{initial:LocationRow[];templates:Template[];publicBase:string}){
 const router=useRouter();const [rows,setRows]=useState(initial);const [selected,setSelected]=useState<LocationRow|null>(null);
 const [form,setForm]=useState<any>(emptyLocation());const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [image,setImage]=useState<File|null>(null),[imagePreview,setImagePreview]=useState("");
 const [menuBusy,setMenuBusy]=useState(false);

 function startNew(){setSelected(null);setForm(emptyLocation());setError("");setImage(null);setImagePreview("")}
 function edit(row:LocationRow){setSelected(row);setForm({name:row.name||"",slug:row.slug||"",address:row.address||"",public_description:row.public_description||"",website_url:row.website_url||"",opening_hours:row.opening_hours||"",contact_name:row.contact_name||"",phone:row.phone||"",email:row.email||"",notes:row.notes||"",capacity_notes:row.capacity_notes||"",maps_url:row.maps_url||"",active:row.active,default_form_template_id:row.default_form_template_id||""});setImage(null);setImagePreview(row.image_path?`${publicBase}/storage/v1/object/public/location-images/${row.image_path}`:"");setError("")}
 function set(k:string,v:any){setForm((f:any)=>({...f,[k]:v}))}
 async function refresh(){const r=await fetch("/api/admin/locations");if(r.ok)setRows(await r.json());router.refresh()}
 async function save(e:any){
  e.preventDefault();setBusy(true);setError("");
  const payload={...form,slug:form.slug||slugify(form.name)};
  const r=await fetch(selected?`/api/admin/locations/${selected.id}`:"/api/admin/locations",{method:selected?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));if(!r.ok){setBusy(false);setError(d.error||"Could not save location.");return}
  const id=selected?.id||d.location?.id;
  if(image&&id){const fd=new FormData();fd.append("file",image);const ir=await fetch(`/api/admin/locations/${id}/image`,{method:"POST",body:fd});const idata=await ir.json().catch(()=>({}));if(!ir.ok){setBusy(false);setError(`Location saved but image failed: ${idata.error||"Upload failed."}`);return}}
  setBusy(false);await refresh();startNew();
 }
 async function toggle(row:LocationRow){const r=await fetch(`/api/admin/locations/${row.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...row,active:!row.active})});if(!r.ok){alert((await r.json()).error||"Could not update.");return}await refresh()}
 async function remove(row:LocationRow){if(!confirm(`Delete ${row.name}?`))return;const r=await fetch(`/api/admin/locations/${row.id}`,{method:"DELETE"});const d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||"Could not delete.");return}await refresh();startNew()}
 async function addMenu(e:any){
  e.preventDefault();if(!selected)return;setMenuBusy(true);
  const fd=new FormData(e.currentTarget);const r=await fetch(`/api/admin/locations/${selected.id}/menu`,{method:"POST",body:fd});const d=await r.json().catch(()=>({}));setMenuBusy(false);
  if(!r.ok){alert(d.error||"Could not add menu item.");return}e.currentTarget.reset();await refresh();const rr=await fetch("/api/admin/locations").then(r=>r.json());const updated=rr.find((x:LocationRow)=>x.id===selected.id);if(updated)edit(updated)
 }
 async function deleteMenu(id:string){if(!confirm("Delete this menu item?"))return;const r=await fetch(`/api/admin/menu-items/${id}`,{method:"DELETE"});if(!r.ok){alert((await r.json()).error||"Could not delete.");return}await refresh();const rr=await fetch("/api/admin/locations").then(r=>r.json());const updated=rr.find((x:LocationRow)=>x.id===selected?.id);if(updated)edit(updated)}

 return <div className="locations-layout v14">
  <section className="locations-list-card">
   <div className="location-list-head"><div><h2>All locations</h2><p>{rows.length} saved venues</p></div><button className="create-button" onClick={startNew}>＋ Add location</button></div>
   <div className="location-cards">
    {rows.map(row=>{const img=row.image_path?`${publicBase}/storage/v1/object/public/location-images/${row.image_path}`:"";return <article className={`location-card ${!row.active?"inactive":""}`} key={row.id}>
     <div className="location-icon location-thumb">{img?<img src={img} alt={row.name}/>:"⌖"}</div>
     <div className="location-summary"><div className="location-name-line"><h3>{row.name}</h3><span className={`event-status ${row.active?"published":"draft"}`}>{row.active?"Active":"Inactive"}</span></div><p>{row.address||"No address added yet"}</p><div className="location-tags">{row.form_templates?.name&&<span>Form: {row.form_templates.name}</span>}{row.phone&&<span>{row.phone}</span>}{row.location_menu_items?.length?<span>{row.location_menu_items.length} menu items</span>:null}</div></div>
     <div className="location-actions">{row.slug&&<a className="mini-button" href={`/locations/${row.slug}`} target="_blank">Public page</a>}<button className="mini-button" onClick={()=>edit(row)}>Edit</button><button className="mini-button" onClick={()=>toggle(row)}>{row.active?"Deactivate":"Activate"}</button><button className="mini-button danger-mini" onClick={()=>remove(row)}>Delete</button></div>
    </article>})}
   </div>
  </section>

  <div className="location-editor-stack">
   <form className="location-editor-card" onSubmit={save}>
    <div className="location-editor-head"><span>⌖</span><div><h2>{selected?"Edit location":"Add location"}</h2><p>This information powers the public venue page.</p></div></div>
    <label>Location image<div className={`venue-image-drop ${imagePreview?"has-image":""}`} onClick={()=>document.getElementById("venue-photo")?.click()}>{imagePreview?<img src={imagePreview} alt="Venue preview"/>:<><b>＋ Upload venue photo</b><small>Landscape works best</small></>}</div><input id="venue-photo" className="hidden-file" type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]||null;setImage(f);setImagePreview(f?URL.createObjectURL(f):imagePreview)}}/></label>
    <div className="form-grid"><label>Location name<input required value={form.name} onChange={e=>{set("name",e.target.value);if(!selected)set("slug",slugify(e.target.value))}} placeholder="e.g. Bambusa Café"/></label><label>Public URL slug<input required value={form.slug} onChange={e=>set("slug",slugify(e.target.value))} placeholder="bambusa-cafe"/></label></div>
    <label>Public description<textarea rows={4} value={form.public_description} onChange={e=>set("public_description",e.target.value)} placeholder="Tell customers about the café or venue..."/></label>
    <label>Full address<textarea rows={2} value={form.address} onChange={e=>set("address",e.target.value)}/></label>
    <div className="form-grid"><label>Opening hours<input value={form.opening_hours} onChange={e=>set("opening_hours",e.target.value)} placeholder="Daily 8AM–9PM"/></label><label>Website<input value={form.website_url} onChange={e=>set("website_url",e.target.value)} placeholder="https://..."/></label></div>
    <label>Google Maps link<input value={form.maps_url} onChange={e=>set("maps_url",e.target.value)} placeholder="https://maps.google.com/..."/></label>
    <div className="form-grid"><label>Contact person<input value={form.contact_name} onChange={e=>set("contact_name",e.target.value)}/></label><label>Phone<input value={form.phone} onChange={e=>set("phone",e.target.value)}/></label></div>
    <label>Email<input type="email" value={form.email} onChange={e=>set("email",e.target.value)}/></label>
    <label>Default participant form<select value={form.default_form_template_id} onChange={e=>set("default_form_template_id",e.target.value)}><option value="">Use global/default form</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}{t.is_default?" — Global default":""}</option>)}</select></label>
    <label>Capacity / setup notes<textarea rows={2} value={form.capacity_notes} onChange={e=>set("capacity_notes",e.target.value)}/></label>
    <label>Internal notes<textarea rows={3} value={form.notes} onChange={e=>set("notes",e.target.value)}/></label>
    <label className="location-toggle"><input type="checkbox" checked={!!form.active} onChange={e=>set("active",e.target.checked)}/><span><b>Active location</b><small>Active venues are visible publicly and available for new events.</small></span></label>
    {error&&<div className="error-box">{error}</div>}
    <div className="location-editor-actions">{selected&&<button type="button" className="secondary-button" onClick={startNew}>Cancel</button>}<button className="create-button" disabled={busy}>{busy?"Saving…":selected?"Save changes":"Add location"}</button></div>
   </form>

   {selected&&<form className="location-editor-card menu-admin-card" onSubmit={addMenu}>
    <div className="location-editor-head"><span>☕</span><div><h2>Menu highlights</h2><p>Add items customers can see on this venue page.</p></div></div>
    <div className="form-grid"><label>Item name<input name="name" required placeholder="Hot Chocolate"/></label><label>Price (₱)<input name="price" type="number" min="0" placeholder="150"/></label></div>
    <div className="form-grid"><label>Category<input name="category" placeholder="Drinks"/></label><label>Photo<input name="file" type="file" accept="image/*"/></label></div>
    <label>Description<textarea name="description" rows={2} placeholder="Short description..."/></label>
    <button className="secondary-button" disabled={menuBusy}>{menuBusy?"Adding…":"＋ Add menu item"}</button>
    <div className="menu-admin-list">{(selected.location_menu_items||[]).sort((a,b)=>a.sort_order-b.sort_order).map(item=><div className="menu-admin-row" key={item.id}><div><b>{item.name}</b><span>{item.category||"Menu"}{item.price!=null?` · ₱${Number(item.price).toLocaleString()}`:""}</span></div><button type="button" className="icon-delete" onClick={()=>deleteMenu(item.id)}>×</button></div>)}</div>
   </form>}
  </div>
 </div>
}