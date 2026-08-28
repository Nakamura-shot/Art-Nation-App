import Header from "@/components/Header";
import LocationsBrowser from "@/components/LocationsBrowser";
import {rest,publicLocationImageUrl} from "@/lib/supabase-rest";

export default async function LocationsPage(){
 const rows=await rest<any[]>(`locations?select=id,name,slug,address,public_description,image_path,opening_hours,phone,email,active,event_sessions(id,starts_at,active)&active=eq.true&order=name.asc`,{},true);
 const locations=rows.map(r=>({...r,image:publicLocationImageUrl(r.image_path),upcoming:(r.event_sessions||[]).filter((s:any)=>s.active&&new Date(s.starts_at)>=new Date()).length}));
 return <><Header/><main className="container public-locations-page">
  <section className="hero"><span className="eyebrow">ART NATION LOCATIONS</span><h1>Find a venue near you.</h1><p>Browse Art Nation Cebu and partner cafés, then see upcoming workshops at each location.</p></section>
  <LocationsBrowser locations={locations}/>
 </main></>
}