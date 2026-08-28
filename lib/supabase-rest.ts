const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && anonKey && serviceKey);
}

export function publicHeaders() {
  if (!url || !anonKey) throw new Error("Supabase public environment variables are not configured.");
  return { apikey: anonKey };
}

export function serviceHeaders(extra: Record<string, string> = {}) {
  if (!url || !serviceKey) throw new Error("Supabase service environment variables are not configured.");
  return { apikey: serviceKey, ...extra };
}

export function supabaseUrl(path: string) {
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  return `${url.replace(/\/$/, "")}${path}`;
}

export async function rest<T>(path: string, init: RequestInit = {}, service = false): Promise<T> {
  const headers = service ? serviceHeaders() : publicHeaders();
  const response = await fetch(supabaseUrl(`/rest/v1/${path}`), {
    ...init,
    headers: { ...headers, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store"
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase request failed with status ${response.status}.`);
  if (response.status === 204 || !text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

export async function uploadReceipt(path: string, file: File) {
  const response = await fetch(supabaseUrl(`/storage/v1/object/payment-receipts/${path}`), {
    method: "POST",
    headers: { ...serviceHeaders(), "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file
  });
  if (!response.ok) throw new Error(await response.text());
  return path;
}

export async function signedReceiptUrl(path: string, expiresIn = 3600) {
  const response = await fetch(supabaseUrl(`/storage/v1/object/sign/payment-receipts/${path}`), {
    method: "POST",
    headers: { ...serviceHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn })
  });
  if (!response.ok) return null;
  const data = await response.json();
  const signed = data.signedURL || data.signedUrl;
  return signed ? supabaseUrl(`/storage/v1${signed}`) : null;
}


export async function uploadEventCover(path: string, file: File) {
  const response = await fetch(supabaseUrl(`/storage/v1/object/event-covers/${path}`), {
    method: "POST",
    headers: { ...serviceHeaders(), "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
    body: file
  });
  if (!response.ok) throw new Error(await response.text());
  return path;
}

export function publicEventCoverUrl(path?: string | null) {
  if (!path) return undefined;
  return supabaseUrl(`/storage/v1/object/public/event-covers/${path}`);
}


export async function uploadLocationImage(path:string,file:File){
 const response=await fetch(supabaseUrl(`/storage/v1/object/location-images/${path}`),{
  method:"POST",
  headers:{...serviceHeaders(),"Content-Type":file.type||"application/octet-stream","x-upsert":"true"},
  body:file
 });
 if(!response.ok)throw new Error(await response.text());
 return path;
}
export function publicLocationImageUrl(path?:string|null){
 if(!path)return undefined;
 return supabaseUrl(`/storage/v1/object/public/location-images/${path}`);
}
export async function uploadMenuImage(path:string,file:File){
 const response=await fetch(supabaseUrl(`/storage/v1/object/menu-images/${path}`),{
  method:"POST",
  headers:{...serviceHeaders(),"Content-Type":file.type||"application/octet-stream","x-upsert":"true"},
  body:file
 });
 if(!response.ok)throw new Error(await response.text());
 return path;
}
export function publicMenuImageUrl(path?:string|null){
 if(!path)return undefined;
 return supabaseUrl(`/storage/v1/object/public/menu-images/${path}`);
}


export async function uploadGuideMedia(path:string,file:File){
 const response=await fetch(supabaseUrl(`/storage/v1/object/guide-media/${path}`),{
  method:"POST",
  headers:{...serviceHeaders(),"Content-Type":file.type||"application/octet-stream","x-upsert":"true"},
  body:file
 });
 if(!response.ok)throw new Error(await response.text());
 return path;
}
export function publicGuideMediaUrl(path?:string|null){
 if(!path)return undefined;
 return supabaseUrl(`/storage/v1/object/public/guide-media/${path}`);
}
export async function uploadTechniqueMedia(path:string,file:File){
 const response=await fetch(supabaseUrl(`/storage/v1/object/technique-media/${path}`),{
  method:"POST",
  headers:{...serviceHeaders(),"Content-Type":file.type||"application/octet-stream","x-upsert":"true"},
  body:file
 });
 if(!response.ok)throw new Error(await response.text());
 return path;
}
export function publicTechniqueMediaUrl(path?:string|null){
 if(!path)return undefined;
 return supabaseUrl(`/storage/v1/object/public/technique-media/${path}`);
}
