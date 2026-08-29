import { NextResponse } from "next/server";
import { publicHeaders, supabaseUrl } from "@/lib/supabase-rest";
import { setAccountCookies } from "@/lib/customer-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accessToken = String(body.access_token || "");
    const refreshToken = String(body.refresh_token || "");
    if (!accessToken || !refreshToken) return NextResponse.json({ error: "Missing login session." }, { status: 400 });

    const check = await fetch(supabaseUrl("/auth/v1/user"), {
      headers: { ...publicHeaders(), Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
    if (!check.ok) return NextResponse.json({ error: "This login link is no longer valid." }, { status: 401 });

    await setAccountCookies(accessToken, refreshToken, Number(body.expires_in || 3600));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not save login session." }, { status: 500 });
  }
}
