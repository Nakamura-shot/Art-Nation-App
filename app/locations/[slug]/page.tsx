import {notFound} from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import {rest,publicLocationImageUrl,publicMenuImageUrl,publicEventCoverUrl} from "@/lib/supabase-rest";

function money(v:any){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(Number(v))}
function eventPrice(s:any){
 if(s.early_bird_price&&s.early_bird_until&&new Date()<=new Date(s.early_bird_until))return Number(s.early_bird_price);
 return Number(s.regular_price);
}

export default async function LocationPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const rows=await rest<any[]>(`locations?select=id,name,slug,address,public_description,image_path,website_url,opening_hours,contact_name,phone,email,maps_url,capacity_notes,active,location_menu_items(id,name,description,price,image_path,category,sort_order,active),event_sessions(id,starts_at,ends_at,capacity,regular_price,early_bird_price,early_bird_until,active,events!inner(title,slug,description,cover_image_path,event_types(name)),bookings(quantity,status))&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,{},true);
 const l=rows[0];if(!l)return notFound();
 const hero=publicLocationImageUrl(l.image_path);
 const upcoming=(l.event_sessions||[]).filter((s:any)=>s.active&&new Date(s.starts_at)>=new Date()).sort((a:any,b:any)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
 const menu=(l.location_menu_items||[]).filter((m:any)=>m.active).sort((a:any,b:any)=>a.sort_order-b.sort_order);
 const mapSrc=l.address?`https://www.google.com/maps?q=${encodeURIComponent(l.address)}&output=embed`:null;
 return <><Header/>
  <main className="location-profile">
   <section className={`location-hero ${hero?"with-image":""}`} style={hero?{backgroundImage:`linear-gradient(rgba(8,20,20,.22),rgba(8,20,20,.62)),url("${hero}")`}:undefined}>
    <div className="location-hero-inner"><span className="eyebrow light">ART NATION LOCATION</span><h1>{l.name}</h1>{l.public_description&&<p>{l.public_description}</p>}<div className="location-hero-meta">{l.address&&<span>⌖ {l.address}</span>}{l.opening_hours&&<span>◷ {l.opening_hours}</span>}{l.capacity_notes&&<span>♧ {l.capacity_notes}</span>}</div></div>
   </section>
   <div className="location-profile-content">
    <section className="profile-section"><div className="section-title-row"><div><span className="eyebrow">UPCOMING</span><h2>Events at {l.name}</h2></div>{upcoming.length>3&&<Link href="/">View all events</Link>}</div>
     <div className="venue-events-grid">{upcoming.length?upcoming.map((s:any)=>{const booked=(s.bookings||[]).filter((b:any)=>b.status!=="cancelled").reduce((n:number,b:any)=>n+b.quantity,0);const seats=Math.max(0,s.capacity-booked);const cover=publicEventCoverUrl(s.events.cover_image_path);return <article className="venue-event-card" key={s.id}><div className="venue-event-image">{cover?<img src={cover} alt={s.events.title}/>:"🎨"}</div><div className="venue-event-body"><span className="pill">{s.events.event_types?.name||"Event"}</span><h3>{s.events.title}</h3><p>{new Date(s.starts_at).toLocaleDateString("en-PH",{timeZone:"Asia/Manila",weekday:"short",month:"short",day:"numeric"})} · {new Date(s.starts_at).toLocaleTimeString("en-PH",{timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit"})}</p><div className="venue-event-price"><strong>{money(eventPrice(s))}</strong><span>{seats} spaces left</span></div><Link className="button" href={`/events/${s.events.slug}`}>View & book</Link></div></article>}):<div className="empty-public-state">No upcoming events at this location yet.</div>}</div>
    </section>
    {menu.length>0&&<section className="profile-section"><div className="section-title-row"><div><span className="eyebrow">MENU</span><h2>Menu highlights</h2></div></div><div className="venue-menu-grid">{menu.map((m:any)=>{const img=publicMenuImageUrl(m.image_path);return <article className="menu-card" key={m.id}><div className="menu-card-image">{img?<img src={img} alt={m.name}/>:<span>☕</span>}</div><div className="menu-card-body">{m.category&&<small>{m.category}</small>}<h3>{m.name}</h3>{m.description&&<p>{m.description}</p>}{m.price!=null&&<strong>{money(m.price)}</strong>}</div></article>})}</div></section>}
    <section className="profile-info-grid">
     <div className="profile-section info-card"><span className="eyebrow">FIND US</span><h2>Location</h2>{mapSrc&&<iframe className="venue-map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>}{l.maps_url&&<a className="secondary-button" href={l.maps_url} target="_blank">Open in Google Maps</a>}</div>
     <div className="profile-section info-card"><span className="eyebrow">CONTACT</span><h2>Contact {l.name}</h2><div className="contact-list">{l.contact_name&&<span><b>Contact:</b> {l.contact_name}</span>}{l.phone&&<a href={`tel:${l.phone}`}><b>Phone:</b> {l.phone}</a>}{l.email&&<a href={`mailto:${l.email}`}><b>Email:</b> {l.email}</a>}{l.website_url&&<a href={l.website_url} target="_blank"><b>Website:</b> Visit site ↗</a>}</div></div>
    </section>
   </div>
  </main>
 </>
}