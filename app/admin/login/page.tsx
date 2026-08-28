"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const data = new FormData(e.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Login failed."); setBusy(false); return; }
    router.push("/admin"); router.refresh();
  }
  return <><Header/><main className="container narrow"><section className="hero compact"><span className="eyebrow">ART NATION ADMIN</span><h1>Sign in</h1></section><form className="panel login-card" onSubmit={submit}><label>Email<input name="email" type="email" required/></label><label>Password<input name="password" type="password" required/></label><button className="button primary-wide" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>{error && <div className="error-box">{error}</div>}</form></main></>;
}
