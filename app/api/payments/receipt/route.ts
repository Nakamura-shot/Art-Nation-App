import { NextResponse } from "next/server";
import { isSupabaseConfigured, rest, uploadReceipt } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const receipt = form.get("receipt");
    const paymentId = form.get("paymentId");
    const orderId = form.get("orderId");

    if (!(receipt instanceof File) || receipt.size === 0) {
      return NextResponse.json({ error: "Payment receipt is required." }, { status: 400 });
    }
    if (typeof paymentId !== "string" || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    const rows = await rest<any[]>(
      `payments?select=id,order_id&id=eq.${encodeURIComponent(paymentId)}&order_id=eq.${encodeURIComponent(orderId)}&limit=1`,
      {},
      true
    );
    if (!rows[0]) return NextResponse.json({ error: "Payment record not found." }, { status: 404 });

    const safeExt = (receipt.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
    const receiptPath = `${orderId}/${crypto.randomUUID()}.${safeExt}`;
    await uploadReceipt(receiptPath, receipt);

    await rest(`payments?id=eq.${encodeURIComponent(paymentId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ receipt_path: receiptPath })
    }, true);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("RECEIPT_UPLOAD_ERROR", error);
    const message = error instanceof Error ? error.message : "Unknown receipt upload error";
    return NextResponse.json({ error: "Could not upload payment receipt.", detail: message }, { status: 500 });
  }
}
