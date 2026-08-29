"use client";
import {useEffect,useState} from "react";

export default function MessengerParticipantInvite({token}:{token:string}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[marketing,setMarketing]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch(`/api/messenger/participant-invite/${encodeURIComponent(token)}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Invitation not found.");setData(d)}).catch(e=>setError(e.message))},[token]);
 async function connect(){setBusy(true);setError("");const r=await fetch(`/api/messenger/participant-invite/${encodeURIComponent(token)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transactional_opt_in:true,marketing_opt_in:marketing})});const d=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setError(d.error||"Could not connect Messenger.");return}window.location.href=d.connectUrl}
 if(error)return <div className="messenger-connect-form"><div className="error-box">{error}</div></div>;
 if(!data)return <div className="messenger-connect-form">Loading invitation…</div>;
 return <div className="messenger-connect-form"><span className="eyebrow">PARTICIPANT INVITATION</span><h1>Hi, {String(data.participant?.name||"there").split(" ")[0]}!</h1><p>You were included in a booking for <b>{data.eventTitle}</b>. Connect your own Messenger account so Art Nation can send you information about your booking.</p><label className="messenger-consent required-consent"><input type="checkbox" checked readOnly/> Send me booking confirmations, event reminders and service updates for this reservation.</label><label className="messenger-consent"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> Also send me occasional Art Nation workshop announcements and offers.</label><small className="messenger-consent-note">Promotional messages are optional. Meta may limit when Page messages can be delivered.</small><button className="messenger-connect-button" type="button" disabled={busy} onClick={connect}>{busy?"Connecting…":"Continue in Messenger"}</button></div>
}
