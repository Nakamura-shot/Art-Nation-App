"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function AdminBookingActions({ id, confirmed }: { id: string; confirmed: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  if (confirmed) return <span className="muted">Verified</span>;
  return <button className="ghost-button" disabled={busy} onClick={async()=>{setBusy(true); const r=await fetch(`/api/admin/bookings/${id}/confirm`,{method:"POST"}); setBusy(false); if(r.ok) router.refresh();}}>{busy ? "Saving..." : "Confirm payment"}</button>;
}
