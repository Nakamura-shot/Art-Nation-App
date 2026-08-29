import { NextResponse } from "next/server";
import { publicHeaders, supabaseUrl } from "@/lib/supabase-rest";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/account/callback`;
    const response = await fetch(`${supabaseUrl("/auth/v1/otp")}?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      headers: { ...publicHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true }),
      cache: "no-store"
    });
    const text = await response.text();
    if (!response.ok) {
      let message = text;
      try { message = JSON.parse(text)?.msg || JSON.parse(text)?.message || text; } catch {}
      return NextResponse.json({ error: message || "Could not send login email." }, { status: response.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not send login email." }, { status: 500 });
  }
}
