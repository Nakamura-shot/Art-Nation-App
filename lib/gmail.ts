import crypto from "crypto";
import {rest} from "@/lib/supabase-rest";

const GOOGLE_TOKEN="https://oauth2.googleapis.com/token";
const GMAIL="https://gmail.googleapis.com/gmail/v1/users/me";

function key(){
 const raw=process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
 if(!raw)throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not configured.");
 return crypto.createHash("sha256").update(raw).digest();
}
export function encryptSecret(value:string){
 const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);
 const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);const tag=cipher.getAuthTag();
 return [iv.toString("base64url"),tag.toString("base64url"),encrypted.toString("base64url")].join(".");
}
export function decryptSecret(value:string){
 const [iv,tag,data]=value.split(".");const decipher=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64url"));
 decipher.setAuthTag(Buffer.from(tag,"base64url"));return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8");
}
export async function getEmailAccount(){
 const rows=await rest<any[]>("email_accounts?select=*&active=eq.true&order=connected_at.desc&limit=1",{},true);
 return rows[0]||null;
}
export async function googleAccessToken(account:any){
 const refresh=decryptSecret(account.refresh_token_encrypted);
 const r=await fetch(GOOGLE_TOKEN,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({
  client_id:process.env.GOOGLE_CLIENT_ID||"",client_secret:process.env.GOOGLE_CLIENT_SECRET||"",
  refresh_token:refresh,grant_type:"refresh_token"
 }),cache:"no-store"});
 const d=await r.json();if(!r.ok)throw new Error(d.error_description||d.error||"Could not refresh Google access token.");
 return d.access_token as string;
}
export async function gmailFetch(path:string,init:RequestInit={}){
 const account=await getEmailAccount();if(!account)throw new Error("No email account is connected.");
 const token=await googleAccessToken(account);
 const r=await fetch(`${GMAIL}${path}`,{...init,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(init.headers||{})},cache:"no-store"});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error?.message||"Gmail request failed.");
 return {data:d,account};
}
export function decodeB64(s?:string){if(!s)return"";return Buffer.from(s.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8")}
export function header(headers:any[],name:string){return headers?.find((h:any)=>h.name?.toLowerCase()===name.toLowerCase())?.value||""}
export function emailAddress(value:string){
 const m=value.match(/<([^>]+)>/);return (m?.[1]||value).trim().toLowerCase();
}
function findBody(payload:any):{html?:string;text?:string}{
 if(!payload)return{};
 const mime=payload.mimeType||"";
 if(mime==="text/html"&&payload.body?.data)return{html:decodeB64(payload.body.data)};
 if(mime==="text/plain"&&payload.body?.data)return{text:decodeB64(payload.body.data)};
 let html="",text="";
 for(const p of payload.parts||[]){const x=findBody(p);if(!html&&x.html)html=x.html;if(!text&&x.text)text=x.text}
 return {html:html||undefined,text:text||undefined};
}
export function parseMessage(m:any){
 const hs=m.payload?.headers||[];const body=findBody(m.payload);
 return {id:m.id,threadId:m.threadId,labelIds:m.labelIds||[],snippet:m.snippet||"",internalDate:m.internalDate,
  from:header(hs,"From"),to:header(hs,"To"),subject:header(hs,"Subject"),date:header(hs,"Date"),
  messageId:header(hs,"Message-ID"),references:header(hs,"References"),html:body.html||"",text:body.text||""};
}
function b64url(v:string){return Buffer.from(v,"utf8").toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
export function rawEmail({from,to,subject,body,inReplyTo,references}:{from:string;to:string;subject:string;body:string;inReplyTo?:string;references?:string}){
 const safeSubject=subject.replace(/[\r\n]/g," ");
 const headers=[`From: ${from}`,`To: ${to}`,`Subject: ${safeSubject}`,"MIME-Version: 1.0",'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit"];
 if(inReplyTo)headers.push(`In-Reply-To: ${inReplyTo}`);
 if(references)headers.push(`References: ${references}`);
 return b64url(headers.join("\r\n")+"\r\n\r\n"+body);
}
