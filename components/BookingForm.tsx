"use client";

import { FormEvent, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { ArtEvent } from "@/lib/types";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export default function BookingForm({ event, price }: { event: ArtEvent; price: number }) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [participantOneName, setParticipantOneName] = useState("");
  const [participantOneIsContact, setParticipantOneIsContact] = useState(false);
  const [messengerOptIn,setMessengerOptIn]=useState(true);
  const [messengerMarketing,setMessengerMarketing]=useState(false);
  const [completedBooking,setCompletedBooking]=useState<{customerId:string;bookingId:string;reference:string}|null>(null);
  const max = Math.max(1, event.capacity - event.booked);
  const total = useMemo(() => quantity * price, [quantity, price]);

  async function makeQR() {
    setQr(await QRCode.toDataURL(window.location.href, { width: 280, margin: 1 }));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      eventId: event.id,
      quantity,
      contact: { name: data.get("contact-name"), email: data.get("contact-email"), phone: data.get("contact-phone") },
      participants: Array.from({ length: quantity }, (_, i) => ({
        answers: Object.fromEntries(event.intakeFields.map((field) => [field.id, data.get(`p${i}-${field.id}`)])),
        guideEmail: i === 0 && participantOneIsContact ? data.get("contact-email") : data.get(`p${i}-guide-email`)
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

      if (!(receipt instanceof File) || receipt.size === 0) {
        throw new Error("The booking was created, but no payment receipt was selected.");
      }

      const receiptBody = new FormData();
      receiptBody.append("receipt", receipt);
      receiptBody.append("paymentId", result.paymentId);
      receiptBody.append("orderId", result.orderId);
      const receiptResponse = await fetch("/api/payments/receipt", { method: "POST", body: receiptBody });
      const receiptResult = await receiptResponse.json();
      if (!receiptResponse.ok) {
        throw new Error(`Reservation ${result.bookingId.slice(0, 8).toUpperCase()} was created, but receipt upload failed: ${receiptResult.detail || receiptResult.error || "Please try again."}`);
      }

      const bookingReference=result.reference || result.bookingId.slice(0, 8).toUpperCase();
      if(result.customerId)setCompletedBooking({customerId:result.customerId,bookingId:result.bookingId,reference:bookingReference});
      form.reset();
      setQuantity(1);
      setContactName("");
      setContactEmail("");
      setParticipantOneName("");
      setParticipantOneIsContact(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if(completedBooking){
    return <section className="booking panel booking-confirmation">
      <div className="booking-confirmation-icon">✓</div>
      <span className="eyebrow">RESERVATION RECEIVED</span>
      <h2>Your booking is saved.</h2>
      <p className="booking-confirmation-lead">Thank you! We received your reservation and payment receipt. Art Nation will verify the payment before the booking is fully confirmed.</p>

      <div className="booking-confirmation-reference">
        <small>Booking reference</small>
        <strong>{completedBooking.reference}</strong>
      </div>

      <div className="booking-confirmation-status">
        <span>Payment status</span>
        <b>Pending verification</b>
      </div>

      <div className="booking-confirmation-note">
        We’ll use the email and mobile number you provided for booking updates.
      </div>
    </section>;
  }

  return (
    <form className="booking panel" onSubmit={submit}>
      <div className="booking-head">
        <div><span className="eyebrow">BOOK THIS EVENT</span><h2>{money(price)} / participant</h2></div>
        <button type="button" className="ghost-button" onClick={makeQR}>Show QR</button>
      </div>
      {qr && <div className="qr-box"><img src={qr} alt="QR code for this booking page" /><small>Scan to open this event page</small></div>}

      <label>Number of participants
        <div className="stepper">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <strong>{quantity}</strong>
          <button type="button" onClick={() => setQuantity((q) => Math.min(max, q + 1))}>+</button>
        </div>
      </label>

      <div className="form-section">
        <h3>Booking contact</h3>
        <label>Full name<input name="contact-name" required value={contactName} onChange={(e) => setContactName(e.target.value)} /></label>
        <label>Email<input name="contact-email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></label>
        <label>Mobile number<input name="contact-phone" required /></label>
      </div>

      {Array.from({ length: quantity }, (_, i) => (
        <div className="form-section participant" key={i}>
          <h3>Participant {i + 1}</h3>
          {i === 0 && (
            <label className="same-person-check">
              <input
                type="checkbox"
                checked={participantOneIsContact}
                onChange={(e) => setParticipantOneIsContact(e.target.checked)}
              />
              Participant 1 is the same as the booking person
            </label>
          )}
          {event.intakeFields.map((field) => (
            <label key={field.id}>{field.label}
              {field.type === "select" ? (
                <select name={`p${i}-${field.id}`} required={field.required} defaultValue="">
                  <option value="" disabled>Select...</option>
                  {field.options?.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea name={`p${i}-${field.id}`} required={field.required} rows={3} />
              ) : (
                <input
                  name={`p${i}-${field.id}`}
                  type={field.type}
                  required={field.required}
                  {...(i === 0 && field.id === "full-name"
                    ? {
                        value: participantOneIsContact ? contactName : participantOneName,
                        onChange: (e) => setParticipantOneName(e.target.value),
                        readOnly: participantOneIsContact
                      }
                    : {})}
                />
              )}
            </label>
          ))}
          {event.guide && <label>Email for painting guide <span className="optional-note">(optional)</span>
            {i === 0 && participantOneIsContact ? (
              <input name={`p${i}-guide-email`} type="email" value={contactEmail} readOnly />
            ) : (
              <input name={`p${i}-guide-email`} type="email" placeholder="participant@example.com" />
            )}
            <small className="field-help">Leave blank to claim this participant's guide using the event QR after payment is confirmed.</small>
          </label>}
        </div>
      ))}


      <div className="form-section messenger-booking-optin">
        <h3>Messenger updates</h3>
        <p className="muted">Since many Art Nation guests find us on Facebook, you can connect Messenger after booking for easier updates.</p>
        <label className="messenger-consent"><input type="checkbox" checked={messengerOptIn} onChange={e=>setMessengerOptIn(e.target.checked)}/> Send booking confirmations, payment updates and event reminders through Messenger.</label>
        {messengerOptIn&&<label className="messenger-consent"><input type="checkbox" checked={messengerMarketing} onChange={e=>setMessengerMarketing(e.target.checked)}/> Also send me occasional special deals and new workshop announcements.</label>}
      </div>
      <div className="form-section">
        <h3>Payment</h3>
        <p className="muted">Pay by GCash or bank transfer / InstaPay, then upload the receipt for Art Nation to verify.</p>
        <label>Payment method
          <select name="payment-method" required defaultValue="">
            <option value="" disabled>Select...</option><option value="gcash">GCash</option><option value="instapay">Bank transfer / InstaPay</option>
          </select>
        </label>
        <label>Payment receipt <input name="receipt" type="file" accept="image/*,.pdf" required /></label>
      </div>

      <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
      <button className="button primary-wide" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Reserve & submit payment"}</button>
      {error && <div className="error-box">{error}</div>}
    </form>
  );
}
