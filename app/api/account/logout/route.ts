import { NextResponse } from "next/server";
import { clearAccountCookies } from "@/lib/customer-auth";

export async function POST() {
  await clearAccountCookies();
  return NextResponse.json({ ok: true });
}
