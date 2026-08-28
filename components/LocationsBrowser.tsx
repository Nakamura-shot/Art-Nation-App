"use client";
import {useMemo,useState} from "react";
import Link from "next/link";

export default function LocationsBrowser({locations}:{locations:any[]}){
 const [q,setQ]=useState("");
 const [hasEvents,setHasEvents]=useState(false);
 const filtered=useMemo(()=>locations.filter(l=>{
   const hay=`${l.name} ${l.address||""} ${l.public_description||""}`.toLowerCase();
   return hay.includes(q.toLowerCase())&&(!hasEvents||l.upcoming>0);
 }),[locations,q,hasEvents]);
 return <>
  <div className="location-public-filters panel"><label>Search locations<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Café, city, barangay..."/></label><label className="public-check"><input type="checkbox" checked={hasEvents} onChange={e=>setHasEvents(e.target.checked)}/> Upcoming events only</label></div>
  <div className="public-location-grid">{filtered.map(l=><article className="public-location-card" key={l.id}>
    <div className="public-location-image">{l.image?<img src={l.image} alt={l.name}/>:<span>⌖</span>}</div>
    <div className="public-location-body"><span className="pill">{l.upcoming} upcoming {l.upcoming===1?"event":"events"}</span><h2>{l.name}</h2><p className="muted">{l.address}</p><p>{l.public_description||"Discover upcoming Art Nation events at this venue."}</p><Link className="button" href={`/locations/${l.slug}`}>View location</Link></div>
  </article>)}</div>
  {!filtered.length&&<div className="empty-public-state">No locations match those filters.</div>}
 </>
}