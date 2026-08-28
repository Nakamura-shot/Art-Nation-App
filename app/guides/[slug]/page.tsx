import {notFound} from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import {rest,publicGuideMediaUrl,publicTechniqueMediaUrl,supabaseUrl} from "@/lib/supabase-rest";

function videoUrl(v?:string|null){
 if(!v)return null;
 if(v.startsWith("http"))return v;
 if(v.startsWith("/"))return supabaseUrl(v);
 return publicGuideMediaUrl(v)||null;
}

export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{access?:string;event?:string}>}){
 const {slug}=await params;const {access,event}=await searchParams;
 const rows=await rest<any[]>(`guides?select=id,title,slug,description,difficulty,estimated_minutes,canvas_size,materials,cover_image_path,active,access_mode,guide_steps(id,title,instructions,image_path,video_url,sort_order,techniques(id,title,slug,short_description,image_path))&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,{},true);
 const g=rows[0];if(!g)return notFound();

 let allowed=g.access_mode==="public";
 if(!allowed&&access){
  const customers=await rest<any[]>(`customers?select=id,customer_guide_access(guide_id)&portal_token=eq.${encodeURIComponent(access)}&limit=1`,{},true);
  allowed=!!customers[0]?.customer_guide_access?.some((a:any)=>a.guide_id===g.id);
 }
 if(!allowed&&event){
  const codes=await rest<any[]>(`event_guide_access_codes?select=id,guide_id,starts_at,expires_at,active&code=eq.${encodeURIComponent(event.toUpperCase())}&guide_id=eq.${g.id}&limit=1`,{},true);
  const c=codes[0];const now=new Date();
  allowed=!!c&&c.active&&(!c.starts_at||now>=new Date(c.starts_at))&&now<=new Date(c.expires_at);
 }

 const cover=publicGuideMediaUrl(g.cover_image_path);
 if(!allowed)return <><Header/><main className="guide-locked">
   <div className="locked-guide-card panel">
    <div className="locked-cover">{cover?<img src={cover} alt={g.title}/>:"🎨"}</div>
    <div className="locked-copy"><span className="eyebrow">ART NATION GUIDE</span><h1>{g.title}</h1><p>{g.description}</p><div className="lock-badge">🔒 This painting guide requires access</div><p className="muted">Access is automatically granted after a qualifying booking is confirmed, or by scanning the activation QR code included with an Art Nation Paint & Sip kit.</p><Link className="button" href="/">Browse events</Link></div>
   </div>
  </main></>;

 const steps=[...(g.guide_steps||[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);
 return <><Header/><main className="guide-public">
  {event&&<div className="event-temporary-access"><b>Workshop access active</b><span>This guide is temporarily available through the Art Nation event QR.</span></div>}
  <section className="guide-public-hero">{cover&&<div className="guide-cover"><img src={cover} alt={g.title}/></div>}<div><span className="eyebrow">ART NATION PAINTING GUIDE</span><h1>{g.title}</h1><p>{g.description}</p><div className="guide-facts">{g.difficulty&&<span>◎ {g.difficulty}</span>}{g.estimated_minutes&&<span>◷ {g.estimated_minutes} minutes</span>}{g.canvas_size&&<span>▣ {g.canvas_size}</span>}</div></div></section>
  {g.materials&&<section className="guide-materials panel"><span className="eyebrow">BEFORE YOU START</span><h2>Materials</h2><div className="materials-lines">{g.materials}</div></section>}
  <section className="guide-steps-public"><div className="section-title-row"><div><span className="eyebrow">STEP BY STEP</span><h2>Paint along</h2></div><span>{steps.length} steps</span></div>
  {steps.map((s:any,i:number)=>{const image=publicGuideMediaUrl(s.image_path),video=videoUrl(s.video_url),tech=s.techniques;return <article className="public-guide-step" key={s.id}><div className="public-step-index">{String(i+1).padStart(2,"0")}</div><div className="public-step-content"><h2>{s.title}</h2><div className="instruction-copy">{s.instructions}</div>{image&&<img className="public-step-image" src={image} alt={s.title}/>}
  {video&&(video.includes("youtube")||video.includes("vimeo")?<a className="secondary-button" href={video} target="_blank">▶ Watch step video</a>:<video className="public-step-video" controls preload="metadata" src={video}/>)}
  {tech&&<Link className="technique-reference" href={`/techniques/${tech.slug}`}><div className="technique-ref-icon">{tech.image_path?<img src={publicTechniqueMediaUrl(tech.image_path)} alt=""/>:"🖌️"}</div><div><small>TECHNIQUE USED</small><b>{tech.title}</b><span>{tech.short_description||"Open technique guide"}</span></div><strong>Learn →</strong></Link>}</div></article>})}</section>
 </main></>;
}