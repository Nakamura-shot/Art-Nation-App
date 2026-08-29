"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import MessengerConnectForm from "@/components/MessengerConnectForm";
import type { ArtEvent } from "@/lib/types";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

type SavedParticipant = { id:string; full_name:string; is_child:boolean; age:number|null };
type Person = { fullName:string; isChild:boolean; age:string; savedId?:string };
type Invite = { participantId:string; fullName:string; isChild:boolean; inviteUrl?:string|null };

function isStandardParticipantField(id:string,label:string){
  const key=`${id} ${label}`.toLowerCase();
  return /full[ _-]?name|participant[ _-]?name|\bage\b|\bsex\b|\bgender\b/.test(key);
}

export default function BookingForm({ event, price }: { event: ArtEvent; price: number }) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [participantOneIsContact, setParticipantOneIsContact] = useState(false);
  const [people,setPeople]=useState<Person[]>([{fullName:"",isChild:false,age:""}]);
  const [account,setAccount]=useState<any>(null);
  const [messengerOptIn,setMessengerOptIn]=useState(true);
  const [messengerMarketing,setMessengerMarketing]=useState(false);
  const [completedBooking,setCompletedBooking]=useState<{customerId:string;bookingId:string;reference:string;participantInvites:Invite[];loggedIn:boolean}|null>(null);
  const max = Math.max(1, event.capacity - event.booked);
  const total = useMemo(() => quantity * price, [quantity, price]);
  const eventFields=event.intakeFields.filter(f=>!isStandardParticipantField(f.id,f.label));
  const savedParticipants:SavedParticipant[]=account?.savedParticipants||[];

  useEffect(()=>{
    fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{
      if(!d?.loggedIn)return;
      setAccount(d);
      setContactName(d.customer?.full_name||"");
      setContactEmail(d.customer?.email||"");
      setContactPhone(d.customer?.phone||"");
    }).catch(()=>{});
  },[]);

  useEffect(()=>{
    setPeople(prev=>Array.from({length:quantity},(_,i)=>prev[i]||{fullName:"",isChild:false,age:""}));
  },[quantity]);

  useEffect(()=>{
    if(participantOneIsContact)setPeople(prev=>prev.map((p,i)=>i===0?{...p,fullName:contactName,isChild:false,age:""}:p));
  },[participantOneIsContact,contactName]);

  function updatePerson(index:number,patch:Partial<Person>){
    setPeople(prev=>prev.map((p,i)=>i===index?{...p,...patch}:p));
  }

  function chooseSaved(index:number,value:string){
    if(value==="self"){
      updatePerson(index,{fullName:contactName,isChild:false,age:"",savedId:"self"});
      if(index===0)setParticipantOneIsContact(true);
      return;
    }
    const saved=savedParticipants.find(p=>p.id===value);
    if(saved){
      updatePerson(index,{fullName:saved.full_name,isChild:!!saved.is_child,age:saved.age?String(saved.age):"",savedId:saved.id});
      if(index===0)setParticipantOneIsContact(false);
    }
  }

  async function makeQR() {
    setQr(await QRCode.toDataURL(window.location.href, { width: 280, margin: 1 }));
  }

  async function copy(text:string){
    await navigator.clipboard.writeText(text);
    alert("Messenger invitation copied.");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    for(let i=0;i<quantity;i++){
      const p=people[i];
      if(!p?.fullName.trim()){setSubmitting(false);setError(`Participant ${i+1} needs a name.`);return}
      if(p.isChild && (!p.age || Number(p.age)<1)){setSubmitting(false);setError(`Please enter the age of child participant ${i+1}.`);return}
    }

    const payload = {
      eventId: event.id,
      quantity,
      contact: { name: contactName, email: contactEmail, phone: contactPhone },
      participants: Array.from({ length: quantity }, (_, i) => ({
        fullName: people[i].fullName.trim(),
        isChild: people[i].isChild,
        age: people[i].isChild ? Number(people[i].age) : null,
        savedParticipantId: people[i].savedId && people[i].savedId!=="self" ? people[i].savedId : null,
        answers: Object.fromEntries(eventFields.map((field) => [field.id, data.get(`p${i}-${field.id}`)])),
        guideEmail: i === 0 && participantOneIsContact ? contactEmail : data.get(`p${i}-guide-email`)
      })),
      paymentMethod: data.get("payment-method"),
      messenger: { transactionalOptIn: messengerOptIn, marketingOptIn: messengerMarketing }
    };

    const receipt = data.get("receipt");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.error || "Booking failed.");

      if (!(receipt instanceof File) || receipt.size === 0) throw new Error("The booking was created, but no payment receipt was selected.");

      const receiptBody = new FormData();
      receiptBody.append("receipt", receipt);
      receiptBody.append("paymentId", result.paymentId);
      receiptBody.append("orderId", result.orderId);
      const receiptResponse = await fetch("/api/payments/receipt", { method: "POST", body: receiptBody });
      const receiptResult = await receiptResponse.json();
      if (!receiptResponse.ok) throw new Error(`Reservation ${result.bookingId.slice(0, 8).toUpperCase()} was created, but receipt upload failed: ${receiptResult.detail || receiptResult.error || "Please try again."}`);

      const bookingReference=result.reference || result.bookingId.slice(0, 8).toUpperCase();
      setCompletedBooking({customerId:result.customerId,bookingId:result.bookingId,reference:bookingReference,participantInvites:result.participantInvites||[],loggedIn:!!result.loggedIn});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if(completedBooking){
    const adultInvites=completedBooking.participantInvites.filter(x=>!x.isChild&&x.inviteUrl);
    return <section className="booking panel booking-confirmation">
      <div className="booking-confirmation-icon">✓</div>
      <span className="eyebrow">RESERVATION RECEIVED</span>
      <h2>Your booking is saved.</h2>
      <p className="booking-confirmation-lead">We received your reservation and payment receipt. Art Nation will verify the payment before the booking is fully confirmed.</p>
      <div className="booking-confirmation-reference"><small>Booking reference</small><strong>{completedBooking.reference}</strong></div>
      <div className="booking-confirmation-status"><span>Payment status</span><b>Pending verification</b></div>

      {messengerOptIn&&<div className="booking-messenger-success"><h3>Connect your Messenger</h3><p>Finish connecting your own Messenger account for booking updates.</p><MessengerConnectForm customerId={completedBooking.customerId} bookingId={completedBooking.bookingId} compact/></div>}

      {adultInvites.length>0&&<div className="participant-invite-box">
        <h3>Invite your other participants to Messenger</h3>
        <p>Each adult should connect their own Messenger account. Copy their personal invitation and send it to them.</p>
        {adultInvites.map(inv=><div className="participant-invite-row" key={inv.participantId}><div><b>{inv.fullName}</b><small>Adult participant</small></div><button type="button" className="mini-button" onClick={()=>copy(inv.inviteUrl!)}>Copy invite</button></div>)}
        {completedBooking.participantInvites.some(x=>x.isChild)&&<small className="participant-child-note">Children do not need a Messenger account; booking updates stay with the booking contact.</small>}
      </div>}

      {!completedBooking.loggedIn&&<div className="account-after-booking"><h3>Make your next booking faster</h3><p>Save your details and remember the people you book for.</p><Link className="create-button" href="/account">Create / log in to My Art Nation</Link></div>}
      <div className="booking-confirmation-note">We’ll use the email and mobile number you provided for booking updates.</div>
    </section>;
  }

  return (
    <form className="booking panel" onSubmit={submit}>
      <div className="booking-head"><div><span className="eyebrow">BOOK THIS EVENT</span><h2>{money(price)} / participant</h2></div><button type="button" className="ghost-button" onClick={makeQR}>Show QR</button></div>
      {account?.loggedIn&&<div className="booking-account-banner"><div><b>Welcome back, {String(account.customer?.full_name||"").split(" ")[0]}.</b><small>Your details and saved participants are ready.</small></div><Link href="/account">My Account</Link></div>}
      {qr && <div className="qr-box"><img src={qr} alt="QR code for this booking page" /><small>Scan to open this event page</small></div>}

      <label>Number of participants<div className="stepper"><button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity((q) => Math.min(max, q + 1))}>+</button></div></label>

      <div className="form-section"><h3>Booking contact</h3><label>Full name<input name="contact-name" required value={contactName} onChange={(e) => setContactName(e.target.value)} /></label><label>Email<input name="contact-email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></label><label>Mobile number<input name="contact-phone" required value={contactPhone} onChange={e=>setContactPhone(e.target.value)} /></label></div>

      {Array.from({ length: quantity }, (_, i) => {
        const person=people[i]||{fullName:"",isChild:false,age:""};
        return <div className="form-section participant" key={i}>
          <h3>Participant {i + 1}</h3>
          {account?.loggedIn&&<label>Use saved participant<select value={person.savedId||""} onChange={e=>chooseSaved(i,e.target.value)}><option value="">Enter someone new…</option><option value="self">{contactName||"Booking contact"} (me)</option>{savedParticipants.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.is_child?` — child${p.age?`, ${p.age}`:""}`:""}</option>)}</select></label>}
          {i === 0 && <label className="same-person-check"><input type="checkbox" checked={participantOneIsContact} onChange={(e) => {setParticipantOneIsContact(e.target.checked);if(e.target.checked)updatePerson(0,{fullName:contactName,isChild:false,age:"",savedId:"self"})}}/>Participant 1 is the same as the booking person</label>}
          <label>Full name<input required value={participantOneIsContact&&i===0?contactName:person.fullName} readOnly={participantOneIsContact&&i===0} onChange={e=>updatePerson(i,{fullName:e.target.value,savedId:undefined})}/></label>
          <label className="child-toggle"><input type="checkbox" checked={person.isChild} disabled={participantOneIsContact&&i===0} onChange={e=>updatePerson(i,{isChild:e.target.checked,age:e.target.checked?person.age:"",savedId:undefined})}/>This participant is a child</label>
          {person.isChild&&<label>Child’s age<input type="number" min="1" max="17" required value={person.age} onChange={e=>updatePerson(i,{age:e.target.value,savedId:undefined})}/></label>}
          {eventFields.map((field) => <label key={field.id}>{field.label}{field.type === "select" ? <select name={`p${i}-${field.id}`} required={field.required} defaultValue=""><option value="" disabled>Select...</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : field.type === "textarea" ? <textarea name={`p${i}-${field.id}`} required={field.required} rows={3} /> : <input name={`p${i}-${field.id}`} type={field.type} required={field.required} />}</label>)}
          {event.guide && <label>Email for painting guide <span className="optional-note">(optional)</span>{i === 0 && participantOneIsContact ? <input name={`p${i}-guide-email`} type="email" value={contactEmail} readOnly /> : <input name={`p${i}-guide-email`} type="email" placeholder="participant@example.com" />}<small className="field-help">Leave blank to claim this participant's guide using the event QR after payment is confirmed.</small></label>}
        </div>
      })}

      <div className="form-section messenger-booking-optin"><h3>Messenger updates</h3><p className="muted">Connect your own Messenger for booking updates. Other adults will get their own invitation after booking.</p><label className="messenger-consent"><input type="checkbox" checked={messengerOptIn} onChange={e=>setMessengerOptIn(e.target.checked)}/> Send booking confirmations, payment updates and event reminders through Messenger.</label>{messengerOptIn&&<label className="messenger-consent"><input type="checkbox" checked={messengerMarketing} onChange={e=>setMessengerMarketing(e.target.checked)}/> Also send me occasional special deals and new workshop announcements.</label>}</div>
      <div className="form-section"><h3>Payment</h3><p className="muted">Pay by GCash or bank transfer / InstaPay, then upload the receipt for Art Nation to verify.</p><label>Payment method<select name="payment-method" required defaultValue=""><option value="" disabled>Select...</option><option value="gcash">GCash</option><option value="instapay">Bank transfer / InstaPay</option></select></label><label>Payment receipt <input name="receipt" type="file" accept="image/*,.pdf" required /></label></div>
      <div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="button primary-wide" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Reserve & submit payment"}</button>{error && <div className="error-box">{error}</div>}
    </form>
  );
}
