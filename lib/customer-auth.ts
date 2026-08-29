import { cookies } from "next/headers";
import { publicHeaders, rest, supabaseUrl } from "@/lib/supabase-rest";

const ACCESS_COOKIE = "artnation_access_token";
const REFRESH_COOKIE = "artnation_refresh_token";

export type AccountUser = {
  id: string;
  email: string;
  customerId: string;
  fullName: string;
  phone: string;
};

async function fetchAuthUser(accessToken: string) {
  const response = await fetch(supabaseUrl("/auth/v1/user"), {
    headers: { ...publicHeaders(), Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  return await response.json();
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(supabaseUrl("/auth/v1/token?grant_type=refresh_token"), {
    method: "POST",
    headers: { ...publicHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store"
  });
  if (!response.ok) return null;
  return await response.json();
}

export async function accountFromRequest(): Promise<AccountUser | null> {
  const jar = await cookies();
  let accessToken = jar.get(ACCESS_COOKIE)?.value || "";
  const refreshToken = jar.get(REFRESH_COOKIE)?.value || "";
  let authUser = accessToken ? await fetchAuthUser(accessToken) : null;

  if (!authUser && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed?.access_token) {
      accessToken = refreshed.access_token;
      if (refreshed.refresh_token) await setAccountCookies(refreshed.access_token, refreshed.refresh_token, Number(refreshed.expires_in || 3600));
      authUser = await fetchAuthUser(accessToken);
    }
  }

  if (!authUser?.id || !authUser?.email) return null;

  let rows = await rest<any[]>(
    `customers?select=id,full_name,email,phone&auth_user_id=eq.${encodeURIComponent(authUser.id)}&limit=1`,
    {},
    true
  );
  let customer = rows[0];

  if (!customer) {
    rows = await rest<any[]>(
      `customers?select=id,full_name,email,phone&email=eq.${encodeURIComponent(authUser.email)}&order=created_at.asc&limit=1`,
      {},
      true
    );
    customer = rows[0];
    if (customer) {
      await rest(`customers?id=eq.${encodeURIComponent(customer.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ auth_user_id: authUser.id })
      }, true);
    }
  }

  if (!customer) {
    const name = String(authUser.user_metadata?.full_name || authUser.email.split("@")[0] || "Art Nation Guest").trim();
    const created = await rest<any[]>("customers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        auth_user_id: authUser.id,
        full_name: name,
        email: authUser.email
      })
    }, true);
    customer = created[0];
  }

  return {
    id: authUser.id,
    email: authUser.email,
    customerId: customer.id,
    fullName: customer.full_name || "",
    phone: customer.phone || ""
  };
}

export async function setAccountCookies(accessToken: string, refreshToken: string, expiresIn = 3600) {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.max(60, Number(expiresIn) || 3600)
  });
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearAccountCookies() {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  jar.set(REFRESH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
